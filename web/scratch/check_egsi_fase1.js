const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare(`
    SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr, activo
    FROM preguntas 
    WHERE id_norma LIKE 'EGSI.1.%'
`).all();

console.log("Rows matching EGSI.1.%:");
console.table(rows);
db.close();
