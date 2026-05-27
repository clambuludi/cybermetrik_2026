const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare(`SELECT id, id_norma, dominio, pregunta, activo FROM preguntas`).all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const allParents = [];
const allChildren = [];
const childrenByParent = {};

rows.forEach(r => {
    const idNorma = (r.id_norma || '').trim();
    if (!idNorma) return;
    
    const m = idNorma.match(SUB_ITEM_REGEX);
    if (m) {
        const parentId = m[1];
        allChildren.push(r);
        if (!childrenByParent[parentId]) {
            childrenByParent[parentId] = [];
        }
        childrenByParent[parentId].push(r);
    } else {
        allParents.push(r);
    }
});

console.log(`Total Parents (macro/flat): ${allParents.length}`);
console.log(`Total Children (sub-items): ${allChildren.length}`);

console.log('\n--- PARENTS IN FASE 2 WITH NO CHILDREN (ORPHANS) ---');
let orphanCount = 0;
allParents.forEach(p => {
    const isFase2 = p.dominio && (p.dominio.includes('A5') || p.dominio.includes('Organizaciones') || p.dominio.includes('Ejecución'));
    if (!isFase2) return;
    
    const children = childrenByParent[p.id_norma] || [];
    if (children.length === 0) {
        orphanCount++;
        console.log(`ORPHAN PARENT -> ID: ${p.id} | id_norma: "${p.id_norma}" | Dominio: "${p.dominio}" | Pregunta: "${p.pregunta.substring(0, 60)}..."`);
    }
});
console.log(`Total Orphan Parents in Phase 2: ${orphanCount}`);

console.log('\n--- PARENTS IN FASE 2 WITH CHILDREN ---');
let activeParentCount = 0;
allParents.forEach(p => {
    const isFase2 = p.dominio && (p.dominio.includes('A5') || p.dominio.includes('Organizaciones') || p.dominio.includes('Ejecución'));
    if (!isFase2) return;
    
    const children = childrenByParent[p.id_norma] || [];
    if (children.length > 0) {
        activeParentCount++;
        console.log(`ACTIVE PARENT -> ID: ${p.id} | id_norma: "${p.id_norma}" | Children count: ${children.length} | Pregunta: "${p.pregunta.substring(0, 60)}..."`);
    }
});
console.log(`Total Active Parents (with children) in Phase 2: ${activeParentCount}`);

db.close();
