const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta, dominio FROM preguntas WHERE activo = 1 ORDER BY id_norma").all();
console.log(`Active questions count: ${rows.length}`);
rows.forEach((r, i) => {
    console.log(`${i+1}. [${r.id_norma}] (ID:${r.id}) "${r.pregunta}" [Dominio: ${r.dominio}]`);
});
db.close();
