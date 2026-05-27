const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare(`SELECT id, id_norma, dominio, pregunta FROM preguntas`).all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const parents = new Set();
const children = [];

rows.forEach(r => {
    const idNorma = (r.id_norma || '').trim();
    if (!idNorma) return;
    
    const m = idNorma.match(SUB_ITEM_REGEX);
    if (m) {
        children.push({
            id: r.id,
            id_norma: idNorma,
            parentId: m[1],
            dominio: r.dominio,
            pregunta: r.pregunta
        });
    } else {
        parents.add(idNorma);
    }
});

console.log(`Total parents in DB: ${parents.size}`);
console.log(`Total children in DB: ${children.length}`);

let orphanCount = 0;
children.forEach(c => {
    if (!parents.has(c.parentId)) {
        orphanCount++;
        console.log(`ORPHAN CHILD -> ID: ${c.id} | id_norma: "${c.id_norma}" | Parent expected: "${c.parentId}" | Dominio: "${c.dominio}" | Pregunta: "${c.pregunta.substring(0, 50)}..."`);
    }
});

console.log(`Total Orphan Children in whole DB: ${orphanCount}`);
db.close();
