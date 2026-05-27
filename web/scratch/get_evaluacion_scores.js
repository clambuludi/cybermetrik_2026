const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const user = reportsDb.prepare("SELECT * FROM users WHERE email = ?").get("evaluacion@gmail.com");
if (!user) {
    console.error("User not found!");
    process.exit(1);
}

const report = reportsDb.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC").get(user.id);
if (!report) {
    console.error("No reports found!");
    process.exit(1);
}

const mappingPath = path.resolve(__dirname, '../src/utils/slug-mapping-data.json');
let mapping = {};
if (fs.existsSync(mappingPath)) {
    mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
}

const parsedData = JSON.parse(report.data);
const parsedParcial = report.progresoParcialDecimal ? JSON.parse(report.progresoParcialDecimal) : {};

function translateRecord(record) {
    if (!record || typeof record !== 'object') return {};
    const newRecord = {};
    for (const key of Object.keys(record)) {
        const mappedKey = mapping[key] || key;
        newRecord[mappedKey] = record[key];
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

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

function printCategoryParents(prefix, label) {
    const catItems = allItems.filter(i => i.id_norma.startsWith(prefix));
    const childrenMap = new Map();
    const parentItems = [];

    catItems.forEach(item => {
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

    console.log(`\n=== CATEGORY: ${label} ===`);
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
                console.log(`${parentIdNorma} | ${parentScore.toFixed(4)} | ${parent.point.substring(0, 60)}`);
            } else {
                console.log(`${parentIdNorma} | N/A | ${parent.point.substring(0, 60)}`);
            }
        } else {
            const { score, isIgnored } = getSingleItemScore(parent);
            if (isIgnored) {
                console.log(`${parentIdNorma} | N/A | ${parent.point.substring(0, 60)}`);
            } else {
                console.log(`${parentIdNorma} | ${score.toFixed(4)} | ${parent.point.substring(0, 60)}`);
            }
        }
    });
}

printCategoryParents('A.5.', 'A5 - Controles Organizacionales');
printCategoryParents('A.6.', 'A6 - Controles Personales');
printCategoryParents('A.7.', 'A7 - Controles Fisicos');
printCategoryParents('A.8.', 'A8 - Controles Tecnologicos');

cmDb.close();
reportsDb.close();
