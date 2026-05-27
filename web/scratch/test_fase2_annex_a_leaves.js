const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, id_dominio_egsi, pregunta FROM preguntas WHERE activo = 1").all();

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

let count = 0;
let details = [];
rows.forEach(item => {
    if (Number(item.id_dominio_egsi) !== 7) return;
    if (!item.id_norma || !item.id_norma.startsWith('A.')) return;
    
    const idNormaTrim = item.id_norma.trim();
    if (childrenMap.has(idNormaTrim)) {
        // Skip parents with children
        return;
    }
    
    count++;
    details.push(item.id_norma);
});

console.log(`Number of active Annex A leaf controls under EGSI Fase 2 (id_dominio_egsi = 7): ${count}`);
// console.log("List of leaf controls:", details.join(", "));

db.close();
