const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id_norma, COUNT(*) as count FROM preguntas WHERE activo = 1 GROUP BY SUBSTR(id_norma, 1, 3)").all();
console.log(rows);
db.close();
