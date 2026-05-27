const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare(`SELECT id, id_norma, dominio, pregunta FROM preguntas WHERE pregunta IS NULL OR trim(pregunta) = ''`).all();
console.log(`Found ${rows.length} empty questions in DB:`);
console.log(JSON.stringify(rows, null, 2));

db.close();
