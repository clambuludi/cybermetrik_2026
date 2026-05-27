const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
const rows = db.prepare("SELECT id, id_norma, pregunta, count(*) as c FROM preguntas WHERE activo = 1 GROUP BY pregunta HAVING c > 1").all();
db.close();

console.log("Duplicate questions in DB:");
console.log(rows);
