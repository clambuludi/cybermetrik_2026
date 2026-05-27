const Database = require('better-sqlite3');
const path = require('path');

// Paths to databases
const cmDbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const reportsDbPath = path.resolve(__dirname, '../reports.db');

const cmDb = new Database(cmDbPath, { readonly: true });
const reportsDb = new Database(reportsDbPath, { readonly: true });

// Load active questions
const rows = cmDb.prepare("SELECT id, id_norma, dominio, pregunta, peso_gpr, id_dominio_egsi FROM preguntas WHERE activo = 1").all();
cmDb.close();

// Group into sections exactly like layout.tsx
const grouped = rows.reduce((acc, row) => {
  let dom = row.dominio;
  if (!dom || dom === 'Dominio General' || dom.trim() === '') {
    const id_norma = (row.id_norma || '').toString();
    if (id_norma.startsWith('5.')) {
      dom = 'Dominio 5: Organizacional';
    } else if (id_norma.startsWith('6.')) {
      dom = 'Dominio 6: Personas';
    } else if (id_norma.startsWith('7.')) {
      dom = 'Dominio 7: Físico';
    } else if (id_norma.startsWith('8.')) {
      dom = 'Dominio 8: Tecnológico';
    } else {
      dom = 'Cláusulas ISO 27001';
    }
  }
  if (!acc[dom]) acc[dom] = [];
  acc[dom].push({
    point: row.pregunta,
    id_norma: row.id_norma,
    id_dominio_egsi: row.id_dominio_egsi,
    peso_gpr: row.peso_gpr,
  });
  return acc;
}, {});

const sections = [];
for (const [dom, items] of Object.entries(grouped)) {
  sections.push({
    title: dom,
    checklist: items
  });
}

// Load latest report for evaluacion@gmail.com (ID 208)
const report = reportsDb.prepare("SELECT * FROM reports WHERE id = 208").get();
reportsDb.close();

if (!report) {
    console.error("Report 208 not found!");
    process.exit(1);
}

const reportData = JSON.parse(report.data);
const progress = {
    completed: reportData.checkedItems || {},
    ignored: reportData.ignoredItems || {},
    evidenceLinks: reportData.evidenceLinks || {},
    progresoParcialDecimal: reportData.progresoParcialDecimal || {}
};

// Also load the DB progressParcialDecimal column if available and merge
if (report.progreso_parcial_decimal) {
    const dbParcial = JSON.parse(report.progreso_parcial_decimal);
    progress.progresoParcialDecimal = { ...progress.progresoParcialDecimal, ...dbParcial };
}

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// Calculate parent scores
const domainParents = {
  A5: [],
  A6: [],
  A7: [],
  A8: []
};

sections.forEach(section => {
  let domainKey = null;
  if (section.title.includes('A5') || section.title.includes('Organizacional')) {
    domainKey = 'A5';
  } else if (section.title.includes('A6') || section.title.includes('Personas')) {
    domainKey = 'A6';
  } else if (section.title.includes('A7') || section.title.includes('Físico')) {
    domainKey = 'A7';
  } else if (section.title.includes('A8') || section.title.includes('Tecnológico')) {
    domainKey = 'A8';
  }
  if (!domainKey) return;

  const childrenMap = new Map();
  const parentItems = [];

  section.checklist.forEach(item => {
    const idNorma = item.id_norma;
    if (typeof idNorma === 'string' && idNorma.trim() !== '') {
      const match = idNorma.trim().match(SUB_ITEM_REGEX);
      if (match) {
        const parentId = match[1];
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
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
    if (progress.ignored[itemId]) return { score: 0, isIgnored: true };

    const val = progress.completed[itemId];
    const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);

    const partialVal = progress.progresoParcialDecimal?.[itemId];
    const pValue = partialVal !== undefined && partialVal !== null
      ? Number(partialVal)
      : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

    const hasDriveLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';

    let score = 0;
    if (numericVal === 1.0) {
      score = hasDriveLink ? 100 : 40;
    } else if (numericVal === 0.5) {
      score = Math.round((hasDriveLink ? pValue : pValue * 0.4) * 100);
    } else {
      score = 0;
    }

    return { score, isIgnored: false, val: numericVal, pValue, hasDriveLink };
  };

  parentItems.forEach(parent => {
    const parentIdNorma = (parent.id_norma || '').trim();
    const children = childrenMap.get(parentIdNorma) || [];

    let parentScore = 0;
    let detailsStr = '';

    if (children.length > 0) {
      let sumScores = 0;
      let activeChildrenCount = 0;
      let parentIgnored = true;
      const childDetails = [];

      children.forEach(child => {
        const childId = generateId(child.point);
        if (!progress.ignored[childId]) {
          parentIgnored = false;
        }
      });

      children.forEach(child => {
        const { score, isIgnored, val, pValue, hasDriveLink } = getSingleItemScore(child);
        if (!isIgnored) {
          sumScores += score;
          activeChildrenCount++;
          childDetails.push(`${child.id_norma}: val=${val}, partial=${pValue}, link=${hasDriveLink ? 'yes' : 'no'} (score=${score})`);
        }
      });

      if (!parentIgnored) {
        parentScore = activeChildrenCount > 0 ? (sumScores / activeChildrenCount) : 0;
        detailsStr = `Children: [${childDetails.join(' | ')}] -> Avg: ${parentScore.toFixed(2)}`;
      } else {
        detailsStr = 'Ignored';
        return; // skip ignored parents
      }
    } else {
      const { score, isIgnored, val, pValue, hasDriveLink } = getSingleItemScore(parent);
      if (isIgnored) {
        detailsStr = 'Ignored';
        return; // skip ignored parents
      } else {
        parentScore = score;
        detailsStr = `Single: val=${val}, partial=${pValue}, link=${hasDriveLink ? 'yes' : 'no'} (score=${score})`;
      }
    }

    domainParents[domainKey].push({
      id_norma: parentIdNorma,
      scorePercent: parentScore,
      scoreDecimal: Number((parentScore / 100).toFixed(4)),
      details: detailsStr
    });
  });
});

// Output results
console.log("==================================================");
console.log("PARENT CONTROLS SCORES (0 TO 1 DECIMAL RANGE)");
console.log("==================================================");

let grandSumDecimal = 0;
let parentCount = 0;

for (const [dom, parents] of Object.entries(domainParents)) {
  console.log(`\n--- DOMAIN ${dom} ---`);
  let domSumDecimal = 0;
  parents.forEach(p => {
    console.log(` - Parent ${p.id_norma}: ${p.scoreDecimal.toFixed(4)}  | Details: ${p.details}`);
    domSumDecimal += p.scoreDecimal;
    grandSumDecimal += p.scoreDecimal;
    parentCount++;
  });
  console.log(`Subtotal Domain ${dom}: ${domSumDecimal.toFixed(4)}`);
}

console.log("\n==================================================");
console.log(`TOTAL PARENTS SUM: ${grandSumDecimal.toFixed(4)}`);
console.log(`TOTAL PARENTS COUNT: ${parentCount}`);
console.log("==================================================");
