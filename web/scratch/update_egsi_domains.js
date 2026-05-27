const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

console.log("Before update:");
const before = db.prepare(`
    SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr 
    FROM preguntas 
    WHERE id_norma LIKE 'EGSI.1.%'
`).all();
console.log(before);

const stmt = db.prepare(`
    UPDATE preguntas 
    SET id_dominio_egsi = 6 
    WHERE id_norma LIKE 'EGSI.1.%'
`);

const result = stmt.run();
console.log(`Updated ${result.changes} rows.`);

console.log("After update:");
const after = db.prepare(`
    SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr 
    FROM preguntas 
    WHERE id_norma LIKE 'EGSI.1.%'
`).all();
console.log(after);

db.close();
