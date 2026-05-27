const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Load mapping
const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'slug-mapping-data.json'), 'utf8'));

function translateKeys(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') {
    return parsedData;
  }
  const result = { ...parsedData };
  const mapRecord = (record) => {
    if (!record || typeof record !== 'object') return record;
    const newRecord = {};
    for (const key of Object.keys(record)) {
      const mappedKey = mapping[key] || key;
      newRecord[mappedKey] = record[key];
    }
    return newRecord;
  };

  if (result.checkedItems) {
    result.checkedItems = mapRecord(result.checkedItems);
  }
  if (result.progresoParcialDecimal) {
    result.progresoParcialDecimal = mapRecord(result.progresoParcialDecimal);
  }
  if (result.ignoredItems) {
    result.ignoredItems = mapRecord(result.ignoredItems);
  }
  if (result.evidenceLinks) {
    result.evidenceLinks = mapRecord(result.evidenceLinks);
  }
  if (result.justifications) {
    result.justifications = mapRecord(result.justifications);
  }

  const nonChecklistKeys = new Set([
    'checkedItems',
    'progresoParcialDecimal',
    'ignoredItems',
    'evidenceLinks',
    'justifications',
    'isoScore',
    'egsiScore',
    'clausesScore',
    'score',
    'completedCount',
    'totalCount',
    'userName',
    'finalize'
  ]);

  for (const key of Object.keys(result)) {
    if (!nonChecklistKeys.has(key)) {
      const mappedKey = mapping[key];
      if (mappedKey && mappedKey !== key) {
        result[mappedKey] = result[key];
        delete result[key];
      }
    }
  }

  return result;
}

function calcularPuntajesConsistentes(sections, progress) {
  let isoSumOfControlScores = 0;
  let isoIgnoredControlsCount = 0;
  let egsiObtainedPoints = 0;
  let egsiIgnoredWeight = 0;
  let clausesPointsSum = 0;

  const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
  const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

  for (const section of sections) {
    if (!section?.checklist) continue;
    const isIsoSection = !section.title.includes('EGSI FASE');
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

          if (isClausesSection) {
            const itemId = generateId(item.point);
            if (!progress.ignored[itemId]) {
              const val = progress.completed[itemId];
              const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
              const partialVal = progress.progresoParcialDecimal?.[itemId];
              const pValue = partialVal !== undefined && partialVal !== null
                ? Number(partialVal)
                : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
              const hasDriveLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';

              if (numericVal === 1.0 || numericVal === 0.5) {
                if (hasDriveLink) {
                  clausesPointsSum += pValue;
                } else {
                  clausesPointsSum += pValue * 0.4;
                }
              }
            }
          }
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

      let score = 0;
      if (numericVal === 1.0) {
        score = 100;
      } else if (numericVal === 0.5) {
        score = Math.round(pValue * 100);
      } else {
        score = 0;
      }

      return { score, isIgnored: false };
    };

    parentItems.forEach(parent => {
      const parentIdNorma = parent.id_norma?.trim() || '';
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
          }
        });

        if (!parentIgnored) {
          const parentScore = activeChildrenCount > 0 ? (sumScores / activeChildrenCount) : 0;
          
          if (isIsoSection) {
            isoSumOfControlScores += parentScore;
          }
          
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            const weight = Number(children[0].peso_gpr) || 0;
            egsiObtainedPoints += parentScore * weight;
          }
        } else {
          if (isIsoSection) {
            isoIgnoredControlsCount++;
          }
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
          if (isIsoSection) {
            isoIgnoredControlsCount++;
          }
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            egsiIgnoredWeight += weight;
          }
        } else {
          if (isIsoSection) {
            isoSumOfControlScores += score;
          }
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            egsiObtainedPoints += score * weight;
          }
        }
      }
    });
  }

  const isoDenominator = 133 - isoIgnoredControlsCount;
  const egsiDenominator = 100 - egsiIgnoredWeight;

  const isoScore = isoDenominator <= 0 ? 0 : Number((isoSumOfControlScores / isoDenominator).toFixed(2));
  const egsiScore = egsiDenominator <= 0 ? 0 : Number((egsiObtainedPoints / egsiDenominator).toFixed(2));
  const clausesScore = Number((clausesPointsSum / 28 * 100).toFixed(2));

  return { isoScore, egsiScore, clausesScore };
}

// Load active questions from cybermetrik.db
const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
const rows = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
cmDb.close();

// Group like layout.tsx
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
    peso_gpr: row.peso_gpr
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

const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'));
const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
reportsDb.close();

if (!targetReport) {
  console.log("No report found for evaluacion@gmail.com");
  process.exit(1);
}

console.log(`Found report ${targetReport.id} for user ${targetReport.user_name}. Original Saved Score: ${targetReport.score}`);

const parsedBefore = JSON.parse(targetReport.data);
const progressBefore = {
  completed: parsedBefore.checkedItems || parsedBefore || {},
  ignored: parsedBefore.ignoredItems || {},
  evidenceLinks: parsedBefore.evidenceLinks || {},
  progresoParcialDecimal: parsedBefore.progresoParcialDecimal || {}
};

const scoresBefore = calcularPuntajesConsistentes(sections, progressBefore);
console.log("Scores BEFORE mapping:", scoresBefore);

const parsedAfter = translateKeys(parsedBefore);
const progressAfter = {
  completed: parsedAfter.checkedItems || parsedAfter || {},
  ignored: parsedAfter.ignoredItems || {},
  evidenceLinks: parsedAfter.evidenceLinks || {},
  progresoParcialDecimal: parsedAfter.progresoParcialDecimal || {}
};

const scoresAfter = calcularPuntajesConsistentes(sections, progressAfter);
console.log("Scores AFTER mapping:", scoresAfter);

// Assert the expected scores
console.log("\nChecking assertion:");
const expectedIso = 48.17;
const expectedEgsi = 24.09;

console.log(`ISO target: ${expectedIso}% vs Calculated: ${scoresAfter.isoScore}%`);
console.log(`EGSI target: ${expectedEgsi}% vs Calculated: ${scoresAfter.egsiScore}%`);

if (Math.abs(scoresAfter.isoScore - expectedIso) < 0.05 && Math.abs(scoresAfter.egsiScore - expectedEgsi) < 0.05) {
  console.log("SUCCESS: Mapped scores match the expected values perfectly!");
} else {
  console.log("ERROR: Mapped scores DO NOT match the expected values!");
  process.exit(1);
}
