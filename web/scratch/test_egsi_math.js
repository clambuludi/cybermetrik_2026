const Database = require('better-sqlite3');
const path = require('path');

// 1. Load questions from the SQLite DB (cybermetrik.db)
const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
sqlite.close();

// Helper to generate Qwik-style IDs
const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

// Recreate the layout.tsx grouping logic
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
        priority: 'essential',
        id_norma: row.id_norma,
        id_dominio_egsi: row.id_dominio_egsi,
        peso_gpr: row.peso_gpr,
        details: `Norma ISO: ${row.id_norma || '-'} | Control: ${row.tipo_control || 'N/A'}`
    });
    return acc;
}, {});

const sections = Object.entries(grouped).map(([dom, items]) => ({
    title: dom,
    checklist: items
}));

// Recreate the calculateScore logic from dashboard-compliance.tsx
const calculateScore = (items, isEgsi, progress) => {
    let totalScore = 0;
    let validItems = 0;
    let obtainedGPRPoints = 0;
    let totalGPRWeight = 0;

    const isFase2 = items.length > 0 && Number(items[0].id_dominio_egsi) === 7;

    items.forEach(item => {
        const id = generateId(item.point);
        if (progress.ignored[id] && !isFase2) return;
        validItems++;

        const val = progress.completed[id];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        const hasLink = !!progress.evidenceLinks[id];

        const partialVal = progress.progresoParcialDecimal?.[id];
        const pValue = partialVal !== undefined && partialVal !== null
          ? Number(partialVal)
          : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

        let finalScore = 0.0;
        if (numericVal === 1.0 || numericVal === 0.5) {
            finalScore = hasLink ? pValue : pValue * 0.4;
        }

        if (isEgsi && !isFase2) {
            const peso = Number(item.peso_gpr) || 0;
            obtainedGPRPoints += finalScore * peso;
            totalGPRWeight += peso;
        } else {
            totalScore += finalScore;
        }
    });

    if (isFase2) {
        return Math.round((totalScore / 93) * 100);
    }

    if (isEgsi) {
        if (totalGPRWeight === 0) return 0;
        return Math.round((obtainedGPRPoints / totalGPRWeight) * 100);
    } else {
        if (validItems === 0) return 0;
        return Math.round((totalScore / validItems) * 100);
    }
};

// Recreate calcularPuntajesConsistentes from madurez.ts (slightly adapted for plain JS)
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
function calcularPuntajesConsistentes(sectionsList, progress) {
  let isoSumOfControlScores = 0;
  let isoIgnoredControlsCount = 0;
  let egsiObtainedPoints = 0;
  let egsiIgnoredWeight = 0;
  let clausesPointsSum = 0;

  for (const section of sectionsList) {
    if (!section || !section.checklist) continue;
    const isIsoSection = !section.title.includes('EGSI FASE');
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

// Start simulation
const progress = {
    completed: {},
    ignored: {},
    evidenceLinks: {},
    progresoParcialDecimal: {}
};

// Flatten items to easily access them by id_norma
const allItemsFlat = [];
sections.forEach(sec => {
    sec.checklist.forEach(item => {
        allItemsFlat.push(item);
    });
});

const egsiFase1Items = allItemsFlat.filter(i => Number(i.id_dominio_egsi) === 6);

console.log(`\nFound ${egsiFase1Items.length} items with id_dominio_egsi = 6.`);
console.log("Items under EGSI Fase 1:");
egsiFase1Items.forEach(i => console.log(`  - ${i.id_norma} (weight: ${i.peso_gpr}): ${i.point.substring(0, 50)}...`));

console.log("\n--- SIMULATION STEP-BY-STEP ---");

// Step 0: Initial state
let scorePhase1 = calculateScore(egsiFase1Items, true, progress);
let globalScores = calcularPuntajesConsistentes(sections, progress);
console.log(`Initial Phase 1 Compliance Card: ${scorePhase1}% | Global EGSI: ${globalScores.egsiScore}%`);

// Answer questions one by one with different completion types and link presence
egsiFase1Items.forEach((item, index) => {
    const id = generateId(item.point);
    const stepNum = index + 1;
    
    // Mix it up: alternate YES/PARTIAL, alternate drive link
    const numericVal = stepNum % 3 === 0 ? 0.5 : 1.0;
    const hasLink = stepNum % 2 === 0;

    progress.completed[id] = numericVal;
    if (numericVal === 0.5) {
        progress.progresoParcialDecimal[id] = 0.5;
    }
    if (hasLink) {
        progress.evidenceLinks[id] = "https://drive.google.com/test-evidence";
    }

    scorePhase1 = calculateScore(egsiFase1Items, true, progress);
    globalScores = calcularPuntajesConsistentes(sections, progress);
    
    console.log(`Step ${stepNum}: Answered ${item.id_norma} with value=${numericVal}, link=${hasLink ? 'Yes' : 'No'} (weight ${item.peso_gpr})`);
    console.log(`        -> Compliance Card Phase 1 Score: ${scorePhase1}% | Global EGSI: ${globalScores.egsiScore}%`);
});

