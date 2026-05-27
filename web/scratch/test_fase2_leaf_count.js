const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE activo = 1 AND id_dominio_egsi = 7").all();

const childrenMap = new Map();
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

rows.forEach(item => {
    const idNorma = item.id_norma || '';
    const match = idNorma.trim().match(SUB_ITEM_REGEX);
    if (match) {
        const parentId = match[1];
        if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId).push(item);
    }
});

let leafCount = 0;
let parentWithChildrenCount = 0;

rows.forEach(item => {
    const idNormaTrim = (item.id_norma || '').trim();
    if (childrenMap.has(idNormaTrim)) {
        parentWithChildrenCount++;
    } else {
        leafCount++;
    }
});

console.log(`Fase 2 rows total: ${rows.length}`);
console.log(`Parents with children count: ${parentWithChildrenCount}`);
console.log(`Leaf nodes count (subitems + parents without children): ${leafCount}`);

db.close();
