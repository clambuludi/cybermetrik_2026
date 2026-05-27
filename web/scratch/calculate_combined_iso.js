const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const user = reportsDb.prepare("SELECT * FROM users WHERE email = ?").get("evaluacion@gmail.com");
const report = reportsDb.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC").get(user.id);

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));

const parsedData = JSON.parse(report.data);
const parsedParcial = report.progresoParcialDecimal ? JSON.parse(report.progresoParcialDecimal) : {};

function translateRecord(record) {
    if (!record || typeof record !== 'object') return {};
    const newRecord = {};
    for (const key of Object.keys(record)) {
        newRecord[mapping[key] || key] = record[key];
    }
    return newRecord;
}

const progress = {
    completed: translateRecord(parsedData.checkedItems || parsedData),
    ignored: translateRecord(parsedData.ignoredItems || {}),
    evidenceLinks: translateRecord(parsedData.evidenceLinks || {}),
    progresoParcialDecimal: translateRecord(parsedParcial)
};

const rows = cmDb.prepare("SELECT * FROM preguntas WHERE activo = 1").all();

const allItems = rows.map(row => {
  let dom = row.dominio;
  if (!dom || dom === 'Dominio General' || dom.trim() === '') {
    const id_norma = (row.id_norma || '').toString();
    if (id_norma.startsWith('5.')) dom = 'Dominio 5: Organizacional';
    else if (id_norma.startsWith('6.')) dom = 'Dominio 6: Personas';
    else if (id_norma.startsWith('7.')) dom = 'Dominio 7: Físico';
    else if (id_norma.startsWith('8.')) dom = 'Dominio 8: Tecnológico';
    else dom = 'Cláusulas ISO 27001';
  }
  return {
    point: row.pregunta,
    id_norma: row.id_norma,
    id_dominio_egsi: row.id_dominio_egsi,
    peso_gpr: row.peso_gpr,
    sectionTitle: dom
  };
});

// Group items into sections
const grouped = allItems.reduce((acc, item) => {
    const title = item.sectionTitle;
    if (!acc[title]) acc[title] = [];
    acc[title].push(item);
    return acc;
}, {});

const sections = Object.entries(grouped).map(([title, checklist]) => ({ title, checklist }));

// Let's print components to show the exact math:
// Total active parent controls in Annex A:
// We can reconstruct how generalIsoScore is computed:
// Let's count them
let isoSum = 0;
let isoCount = 0;
let clausesSum = 0;
let clausesCount = 0;

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

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
        score = hasDriveLink ? 1.0 : 0.4;
    } else if (numericVal === 0.5) {
        score = hasDriveLink ? pValue : pValue * 0.4;
    }
    return { score, isIgnored: false };
};

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
                if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
                childrenMap.get(parentId).push(item);
            } else {
                parentItems.push(item);
            }
        } else {
            parentItems.push(item);
        }
    });

    parentItems.forEach(parent => {
        const parentIdNorma = parent.id_norma?.trim() || '';
        const children = childrenMap.get(parentIdNorma) || [];

        if (children.length > 0) {
            let sumScores = 0;
            let activeChildrenCount = 0;
            let parentIgnored = true;

            children.forEach(child => {
                const childId = generateId(child.point);
                if (!progress.ignored[childId]) parentIgnored = false;
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
                    isoSum += parentScore;
                    isoCount++;
                } else if (isClausesSection) {
                    clausesSum += parentScore;
                    clausesCount++;
                }
            }
        } else {
            const { score, isIgnored } = getSingleItemScore(parent);
            if (!isIgnored) {
                if (isIsoSection) {
                    isoSum += score;
                    isoCount++;
                } else if (isClausesSection) {
                    clausesSum += score;
                    clausesCount++;
                }
            }
        }
    });
});

console.log("=== EXACT MATH FOR GENERAL ISO SCORE ===");
console.log("isoCount (Annex A parents):", isoCount);
console.log("isoSum (Annex A parents sum):", isoSum);
console.log("clausesCount (Clauses parents):", clausesCount);
console.log("clausesSum (Clauses parents sum):", clausesSum);
console.log("Computed combined average percentage:", (((isoSum + clausesSum) / (isoCount + clausesCount)) * 100).toFixed(4), "%");

cmDb.close();
reportsDb.close();
