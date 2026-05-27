const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare(`SELECT id, id_norma, dominio, pregunta, activo FROM preguntas WHERE dominio LIKE '%A5%'`).all();
console.log(JSON.stringify(rows, null, 2));

db.close();
