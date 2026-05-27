const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const allActive = db.prepare(`
  SELECT id_norma, pregunta, peso_gpr, dominio, id_dominio_egsi
  FROM preguntas 
  WHERE activo = 1
`).all();

// Group into sections to mimic Qwik's checklists context structure
const sectionsMap = new Map();
allActive.forEach(item => {
  const dom = item.dominio || 'Otros';
  if (!sectionsMap.has(dom)) {
    sectionsMap.set(dom, []);
  }
  sectionsMap.get(dom).push({
    point: item.pregunta, // Qwik frontend checklist item uses "point" for question name/text
    id_norma: item.id_norma,
    peso_gpr: item.peso_gpr,
    id_dominio_egsi: item.id_dominio_egsi
  });
});

const sections = Array.from(sectionsMap.entries()).map(([title, checklist]) => ({
  title,
  checklist
}));

const progress = {
  completed: {},
  ignored: {},
  evidenceLinks: {},
  progresoParcialDecimal: {}
};

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const a51a = allActive.find(i => i.id_norma === 'A.5.1.a');
const a51b = allActive.find(i => i.id_norma === 'A.5.1.b');

if (a51a && a51b) {
  const idA = generateId(a51a.pregunta);
  const idB = generateId(a51b.pregunta);
  progress.completed[idA] = 1.0;
  progress.completed[idB] = 0.5;
  progress.progresoParcialDecimal[idB] = 0.4;
}

// Function implementation prototype
function calcularPuntajesConsistentes(sections, progress) {
  if (!Array.isArray(sections)) return { isoScore: 0, egsiScore: 0 };

  let isoSumOfControlScores = 0;
  let isoIgnoredControlsCount = 0;
  let egsiObtainedPoints = 0;
  let egsiIgnoredWeight = 0;

  const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
  const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

  for (const section of sections) {
    if (!section?.checklist) continue;
    const isIsoSection = !section.title.includes('EGSI FASE');

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
            console.log(`Parent: ${parentIdNorma}, score: ${parentScore}`);
            isoSumOfControlScores += parentScore;
          }
          
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            const weight = Number(children[0].peso_gpr) || 0;
            console.log(`EGSI Parent: ${parentIdNorma}, parentScore: ${parentScore}, weight: ${weight}`);
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
            if (score > 0) {
              console.log(`Flat Parent: ${parentIdNorma}, score: ${score}`);
            }
            isoSumOfControlScores += score;
          }
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            if (score > 0) {
              console.log(`EGSI Flat Parent: ${parentIdNorma}, score: ${score}, weight: ${weight}`);
            }
            egsiObtainedPoints += score * weight;
          }
        }
      }
    });
  }

  const isoDenominator = 133 - isoIgnoredControlsCount;
  const egsiDenominator = 100 - egsiIgnoredWeight;

  console.log(`isoSumOfControlScores: ${isoSumOfControlScores}, isoDenominator: ${isoDenominator}`);
  console.log(`egsiObtainedPoints: ${egsiObtainedPoints}, egsiDenominator: ${egsiDenominator}`);

  const isoScore = isoDenominator <= 0 ? 0 : Number((isoSumOfControlScores / isoDenominator).toFixed(2));
  const egsiScore = egsiDenominator <= 0 ? 0 : Number((egsiObtainedPoints / egsiDenominator).toFixed(2));

  return { isoScore, egsiScore };
}

const result = calcularPuntajesConsistentes(sections, progress);
console.log("Calculation Result:", result);

db.close();
