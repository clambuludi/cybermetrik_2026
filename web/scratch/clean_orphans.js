const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
console.log('Opening database:', dbPath);
const db = new Database(dbPath);

// Fetch all preguntas
const rows = db.prepare(`SELECT id, id_norma, dominio, pregunta, activo FROM preguntas`).all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// Identify all sub-items (children)
const childPrefixes = new Set();
rows.forEach(r => {
    const idNorma = (r.id_norma || '').trim();
    const m = idNorma.match(SUB_ITEM_REGEX);
    if (m) {
        childPrefixes.add(m[1]);
    }
});

// Identify orphan parent controls in Phase 2 (id_dominio_egsi = 7 / EJECUCION A5)
const orphansToDelete = [];
rows.forEach(r => {
    const idNorma = (r.id_norma || '').trim();
    if (!idNorma) return;
    
    const isFase2 = r.dominio && (r.dominio.includes('A5') || r.dominio.includes('Organizaciones') || r.dominio.includes('Ejecución'));
    if (!isFase2) return;
    
    const isParent = !idNorma.match(SUB_ITEM_REGEX);
    if (isParent && !childPrefixes.has(idNorma)) {
        orphansToDelete.push(r);
    }
});

console.log(`Found ${orphansToDelete.length} orphan macro records to delete:`);
orphansToDelete.forEach(o => {
    console.log(`- ID: ${o.id} | id_norma: "${o.id_norma}" | Pregunta: "${o.pregunta.substring(0, 60)}..."`);
});

if (orphansToDelete.length > 0) {
    const deleteStmt = db.prepare('DELETE FROM preguntas WHERE id = ?');
    
    // Run in a transaction
    const transaction = db.transaction((list) => {
        for (const item of list) {
            deleteStmt.run(item.id);
        }
    });
    
    transaction(orphansToDelete);
    console.log('\nSuccess! All orphan records have been deleted from cybermetrik.db.');
} else {
    console.log('\nNo orphan records found to delete.');
}

db.close();
