const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id_norma FROM preguntas WHERE activo = 1 AND id_norma LIKE 'A.5%' ORDER BY id_norma").all();
console.log(rows.map(r => r.id_norma));
db.close();
