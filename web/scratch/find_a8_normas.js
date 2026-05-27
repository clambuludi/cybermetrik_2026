const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta, activo FROM preguntas WHERE id_norma IN ('A.8.3', 'A.8.10', 'A.8.12', 'A.8.13', 'A.8.15', 'A.8.17', 'A.8.26', 'A.8.28')").all();
console.log(rows);
db.close();
