const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'slug-mapping-data.json'), 'utf8'));
const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
const rows = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
cmDb.close();

// Group like layout.tsx
const grouped = rows.reduce((acc, row) => {
  let dom = row.dominio;
  if (!dom || dom === 'Dominio General' || dom.trim() === '') {
    const id_norma = (row.id_norma || '').toString();
    if (id_norma.startsWith('5.')) dom = 'Dominio 5: Organizacional';
    else if (id_norma.startsWith('6.')) dom = 'Dominio 6: Personas';
    else if (id_norma.startsWith('7.')) dom = 'Dominio 7: Físico';
    else if (id_norma.startsWith('8.')) dom = 'Dominio 8: Tecnológico';
    else dom = 'Cláusulas ISO 27001';
  }
  if (!acc[dom]) acc[dom] = [];
  acc[dom].push({
    point: row.pregunta,
    id_norma: row.id_norma,
    id_dominio_egsi: row.id_dominio_egsi,
    peso_gpr: row.peso_gpr
  });
  return acc;
}, {});

const sections = [];
for (const [dom, items] of Object.entries(grouped)) {
  sections.push({ title: dom, checklist: items });
}

const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'));
const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
reportsDb.close();

const parsed = JSON.parse(targetReport.data);
const oldChecked = parsed.checkedItems || parsed || {};
const newChecked = {};
for (const k of Object.keys(oldChecked)) {
  newChecked[mapping[k] || k] = oldChecked[k];
}

const ignoredItems = parsed.ignoredItems || {};
const newIgnored = {};
for (const k of Object.keys(ignoredItems)) {
  newIgnored[mapping[k] || k] = ignoredItems[k];
}

const progresoParcialDecimal = parsed.progresoParcialDecimal || {};
const newPartial = {};
for (const k of Object.keys(progresoParcialDecimal)) {
  newPartial[mapping[k] || k] = progresoParcialDecimal[k];
}

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

sections.forEach(section => {
  if (section.title === 'Cláusulas ISO 27001') return;
  const isIsoSection = !section.title.includes('EGSI FASE');
  if (!isIsoSection) return;

  console.log(`\n--- Section: ${section.title} ---`);
  
  const childrenMap = new Map();
  const parentItems = [];

  section.checklist.forEach(item => {
    const idNorma = item.id_norma;
    if (typeof idNorma === 'string' && idNorma.trim() !== '') {
      const match = idNorma.trim().match(SUB_ITEM_REGEX);
      if (match) {
        const parentId = match[1];
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId).push(item);
      } else {
        parentItems.push(item);
      }
    } else {
      parentItems.push(item);
    }
  });

  const getSingleItemScore = (item) => {
    const itemId = generateId(item.point);
    if (newIgnored[itemId]) return { score: 0, isIgnored: true };
    const val = newChecked[itemId];
    const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
    const partialVal = newPartial[itemId];
    const pValue = partialVal !== undefined && partialVal !== null
      ? Number(partialVal)
      : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
    return { score: numericVal === 1.0 ? 100 : numericVal === 0.5 ? Math.round(pValue * 100) : 0, isIgnored: false, numericVal, pValue };
  };

  parentItems.forEach(parent => {
    const parentIdNorma = parent.id_norma?.trim() || '';
    const children = childrenMap.get(parentIdNorma) || [];

    if (children.length > 0) {
      let sumScores = 0;
      let activeChildrenCount = 0;
      children.forEach(child => {
        const { score, isIgnored, numericVal } = getSingleItemScore(child);
        if (!isIgnored) {
          sumScores += score;
          activeChildrenCount++;
        }
      });
      const parentScore = activeChildrenCount > 0 ? (sumScores / activeChildrenCount) : 0;
      console.log(`Parent (with children) ${parent.id_norma}: score: ${parentScore} (active children: ${activeChildrenCount})`);
    } else {
      const { score, isIgnored, numericVal } = getSingleItemScore(parent);
      if (score > 0) {
        console.log(`Single parent ${parent.id_norma}: score: ${score} (val: ${numericVal})`);
      }
    }
  });
});
