const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare(`SELECT id, id_norma, pregunta FROM preguntas WHERE dominio = 'EJECUCION A5: Controles Organizacionales'`).all();
console.log(`Total A5 rows in DB: ${rows.length}`);
console.log(rows.map(r => r.id_norma).join(', '));

db.close();
