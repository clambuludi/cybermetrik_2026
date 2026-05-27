const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const summary = db.prepare(`
    SELECT id_dominio_egsi, COUNT(*) as count, SUM(peso_gpr) as total_peso
    FROM preguntas 
    WHERE id_dominio_egsi >= 6 AND id_dominio_egsi <= 9 AND activo = 1
    GROUP BY id_dominio_egsi
`).all();

console.log("EGSI Phases Summary:");
console.table(summary);

const grandTotal = db.prepare(`
    SELECT COUNT(*) as count, SUM(peso_gpr) as total_peso
    FROM preguntas 
    WHERE id_dominio_egsi >= 6 AND id_dominio_egsi <= 9 AND activo = 1
`).get();

console.log("EGSI Grand Total:");
console.log(grandTotal);

db.close();
