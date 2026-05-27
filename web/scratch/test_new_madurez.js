const Database = require('better-sqlite3');
const path = require('path');

function calcularPuntajesConsistentes(
  sections,
  progress
) {
  if (!Array.isArray(sections)) {
    return {
      isoScore: 0,
      egsiScore: 0,
      clausesScore: 0,
      generalIsoScore: 0,
      a5Score: 0,
      a6Score: 0,
      a7Score: 0,
      a8Score: 0
    };
  }

  let isoSubitemsSum = 0;
  let isoSubitemsActiveCount = 0;
  let clausesSubitemsSum = 0;
  let clausesSubitemsActiveCount = 0;

  let a5SubitemsSum = 0;
  let a5SubitemsActiveCount = 0;
  let a6SubitemsSum = 0;
  let a6SubitemsActiveCount = 0;
  let a7SubitemsSum = 0;
  let a7SubitemsActiveCount = 0;
  let a8SubitemsSum = 0;
  let a8SubitemsActiveCount = 0;

  let egsiObtainedPoints = 0;
  let egsiIgnoredWeight = 0;

  const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
  const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

  for (const section of sections) {
    if (!section?.checklist) continue;

    const isIsoSection = !section.title.includes('EGSI FASE') && section.title !== 'Cláusulas ISO 27001';
    const isClausesSection = section.title === 'Cláusulas ISO 27001';

    const childrenMap = new Map();
    const parentItems = [];

    section.checklist.forEach((item) => {
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
          const childIgnored = progress.ignored[childId];
          if (!childIgnored) {
            parentIgnored = false;
          }
        });

        children.forEach(child => {
          const { score, isIgnored } = getSingleItemScore(child);
          if (!isIgnored) {
            sumScores += score;
            activeChildrenCount++;

            // Accumulate directly at sub-item level for ISO compliance percentages
            if (isIsoSection) {
              isoSubitemsSum += score;
              isoSubitemsActiveCount++;
            } else if (isClausesSection) {
              clausesSubitemsSum += score;
              clausesSubitemsActiveCount++;
            }

            if (section.title.includes('A5')) {
              a5SubitemsSum += score;
              a5SubitemsActiveCount++;
            } else if (section.title.includes('A6')) {
              a6SubitemsSum += score;
              a6SubitemsActiveCount++;
            } else if (section.title.includes('A7')) {
              a7SubitemsSum += score;
              a7SubitemsActiveCount++;
            } else if (section.title.includes('A8')) {
              a8SubitemsSum += score;
              a8SubitemsActiveCount++;
            }
          }
        });

        if (!parentIgnored) {
          const parentScore = activeChildrenCount > 0 ? (sumScores / activeChildrenCount) : 0;

          // GPR / EGSI requires parent averages because weights are at parent level
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            const weight = Number(children[0].peso_gpr) || 0;
            egsiObtainedPoints += parentScore * weight;
          }
        } else {
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            const weight = Number(children[0].peso_gpr) || 0;
            egsiIgnoredWeight += weight;
          }
        }
      } else {
        const { score, isIgnored } = getSingleItemScore(parent);
        const weight = Number(parent.peso_gpr) || 0;

        if (isIgnored) {
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            egsiIgnoredWeight += weight;
          }
        } else {
          // Accumulate directly at sub-item level for ISO compliance percentages
          if (isIsoSection) {
            isoSubitemsSum += score;
            isoSubitemsActiveCount++;
          } else if (isClausesSection) {
            clausesSubitemsSum += score;
            clausesSubitemsActiveCount++;
          }

          if (section.title.includes('A5')) {
            a5SubitemsSum += score;
            a5SubitemsActiveCount++;
          } else if (section.title.includes('A6')) {
            a6SubitemsSum += score;
            a6SubitemsActiveCount++;
          } else if (section.title.includes('A7')) {
            a7SubitemsSum += score;
            a7SubitemsActiveCount++;
          } else if (section.title.includes('A8')) {
            a8SubitemsSum += score;
            a8SubitemsActiveCount++;
          }

          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            egsiObtainedPoints += score * weight;
          }
        }
      }
    });
  }

  const egsiDenominator = 100 - egsiIgnoredWeight;

  const isoScore = isoSubitemsActiveCount <= 0 ? 0 : Number((isoSubitemsSum / isoSubitemsActiveCount).toFixed(2));
  const egsiScore = egsiDenominator <= 0 ? 0 : Number((egsiObtainedPoints / egsiDenominator).toFixed(2));
  const clausesScore = clausesSubitemsActiveCount <= 0 ? 0 : Number((clausesSubitemsSum / clausesSubitemsActiveCount).toFixed(2));

  const totalIsoActiveCount = isoSubitemsActiveCount + clausesSubitemsActiveCount;
  const generalIsoScore = totalIsoActiveCount <= 0 ? 0 : Number(((isoSubitemsSum + clausesSubitemsSum) / totalIsoActiveCount).toFixed(2));

  const a5Score = a5SubitemsActiveCount <= 0 ? 0 : Number((a5SubitemsSum / a5SubitemsActiveCount).toFixed(2));
  const a6Score = a6SubitemsActiveCount <= 0 ? 0 : Number((a6SubitemsSum / a6SubitemsActiveCount).toFixed(2));
  const a7Score = a7SubitemsActiveCount <= 0 ? 0 : Number((a7SubitemsSum / a7SubitemsActiveCount).toFixed(2));
  const a8Score = a8SubitemsActiveCount <= 0 ? 0 : Number((a8SubitemsSum / a8SubitemsActiveCount).toFixed(2));

  return {
    isoScore,
    egsiScore,
    clausesScore,
    generalIsoScore,
    a5Score,
    a6Score,
    a7Score,
    a8Score
  };
}

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

const scores = calcularPuntajesConsistentes(sections, progress);
console.log("=== VERIFYING NEW SCORES (PLAIN JS) ===");
console.log(scores);
console.log("============================");
