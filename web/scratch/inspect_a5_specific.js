const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare(`SELECT id, id_norma, pregunta FROM preguntas WHERE id_norma LIKE 'A.5.1%' OR id_norma LIKE 'A.5.2%'`).all();
console.log(JSON.stringify(rows, null, 2));

db.close();
