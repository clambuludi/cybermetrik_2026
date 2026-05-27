const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
const withA = db.prepare("SELECT id, id_norma, activo, pregunta FROM preguntas WHERE id_norma LIKE 'A.%'").all();
const withoutA = db.prepare("SELECT id, id_norma, activo, pregunta FROM preguntas WHERE id_norma NOT LIKE 'A.%' AND id_norma NOT LIKE 'EGSI%' AND id_norma NOT LIKE 'Clausula%'").all();
db.close();

console.log("Questions with 'A.':", withA.length);
console.log("Questions without 'A.':", withoutA.length);
if (withoutA.length > 0) {
  console.log("Sample without 'A.':", withoutA.slice(0, 10));
}
