const Database = require('better-sqlite3');
const path = require('path');

const cmDbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const reportsDbPath = path.resolve(__dirname, '../reports.db');

const cmDb = new Database(cmDbPath, { readonly: true });
const reportsDb = new Database(reportsDbPath, { readonly: true });

// Load active questions
const rows = cmDb.prepare("SELECT id, id_norma, dominio, pregunta, peso_gpr, id_dominio_egsi FROM preguntas WHERE activo = 1").all();
cmDb.close();

// Group into sections
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

// Load report 208
const report = reportsDb.prepare("SELECT * FROM reports WHERE id = 208").get();
reportsDb.close();

const reportData = JSON.parse(report.data);
const progress = {
    completed: reportData.checkedItems || {},
    ignored: reportData.ignoredItems || {},
    evidenceLinks: reportData.evidenceLinks || {},
    progresoParcialDecimal: reportData.progresoParcialDecimal || {}
};

if (report.progreso_parcial_decimal) {
    const dbParcial = JSON.parse(report.progreso_parcial_decimal);
    progress.progresoParcialDecimal = { ...progress.progresoParcialDecimal, ...dbParcial };
}

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

let isoSumOfControlScores = 0;
let isoActiveControlsCount = 0;
let clausesSumOfParentScores = 0;
let clausesActiveCount = 0;

sections.forEach(section => {
    const isIsoSection = !section.title.includes('EGSI FASE') && section.title !== 'Cláusulas ISO 27001';
    const isClausesSection = section.title === 'Cláusulas ISO 27001';

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

      return { score, isIgnored: false };
    };

    parentItems.forEach(parent => {
      const parentIdNorma = (parent.id_norma || '').trim();
      const children = childrenMap.get(parentIdNorma) || [];

      if (children.length > 0) {
        let sumScores = 0;
        let activeChildrenCount = 0;
        let parentIgnored = true;

        children.forEach(child => {
          const childId = generateId(child.point);
          if (!progress.ignored[childId]) {
            parentIgnored = false;
          }
        });

        children.forEach(child => {
          const { score, isIgnored } = getSingleItemScore(child);
          if (!isIgnored) {
            sumScores += score;
            activeChildrenCount++;
          }
        });

        if (!parentIgnored) {
          const parentScore = activeChildrenCount > 0 ? (sumScores / activeChildrenCount) : 0;
          if (isIsoSection) {
            isoSumOfControlScores += parentScore;
            isoActiveControlsCount++;
          } else if (isClausesSection) {
            clausesSumOfParentScores += parentScore;
            clausesActiveCount++;
          }
        }
      } else {
        const { score, isIgnored } = getSingleItemScore(parent);
        if (!isIgnored) {
          if (isIsoSection) {
            isoSumOfControlScores += score;
            isoActiveControlsCount++;
          } else if (isClausesSection) {
            clausesSumOfParentScores += score;
            clausesActiveCount++;
          }
        }
      }
    });
});

const totalIsoActiveCount = isoActiveControlsCount + clausesActiveCount;
const generalIsoScore = totalIsoActiveCount <= 0 ? 0 : Number(((isoSumOfControlScores + clausesSumOfParentScores) / totalIsoActiveCount).toFixed(2));
const isoScore = isoActiveControlsCount <= 0 ? 0 : Number((isoSumOfControlScores / isoActiveControlsCount).toFixed(2));
const clausesScore = clausesActiveCount <= 0 ? 0 : Number((clausesSumOfParentScores / clausesActiveCount).toFixed(2));

console.log("=== CALCULATING ISO 27001:2022 SCORE FOR REPORT 208 ===");
console.log(`- isoSumOfControlScores (Annex A sum of scores): ${isoSumOfControlScores.toFixed(4)}`);
console.log(`- isoActiveControlsCount (Annex A active parents): ${isoActiveControlsCount}`);
console.log(`- isoScore (Annex A average): ${isoScore.toFixed(2)}%`);
console.log(`\n- clausesSumOfParentScores (Clauses sum of scores): ${clausesSumOfParentScores.toFixed(4)}`);
console.log(`- clausesActiveCount (Clauses active parents): ${clausesActiveCount}`);
console.log(`- clausesScore (Clauses average): ${clausesScore.toFixed(2)}%`);
console.log(`\n- totalIsoActiveCount (Combined count): ${totalIsoActiveCount}`);
console.log(`- generalIsoScore (Combined average): ${generalIsoScore.toFixed(2)}%`);
console.log("======================================================");
