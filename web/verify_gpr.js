const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath, { readonly: true });

console.log("=== VERIFICACIÓN DE VALORES EN BD ===");
const query = db.prepare(`SELECT id_norma, peso_gpr FROM preguntas WHERE id_norma IN ('EGSI.1.2', 'A.5.1', '9.1a', 'EGSI.4.1')`);
const results = query.all();
console.table(results);
db.close();
