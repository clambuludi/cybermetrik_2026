const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id_norma, activo, COUNT(*) as count FROM preguntas GROUP BY id_norma, activo").all();
console.log("Total unique combinations of id_norma and activo:");
console.log(rows.filter(r => r.id_norma.startsWith('5.') || r.id_norma.startsWith('6.') || r.id_norma.startsWith('7.') || r.id_norma.startsWith('8.')));
db.close();
