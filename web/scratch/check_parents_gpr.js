const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

console.log("Parent vs Children A.5.1:");
console.log(db.prepare("SELECT id, id_norma, peso_gpr, id_dominio_egsi FROM preguntas WHERE id_norma LIKE 'A.5.1%'").all());

console.log("\nParent vs Children A.5.2:");
console.log(db.prepare("SELECT id, id_norma, peso_gpr, id_dominio_egsi FROM preguntas WHERE id_norma LIKE 'A.5.2%'").all());

console.log("\nFlat item A.5.3:");
console.log(db.prepare("SELECT id, id_norma, peso_gpr, id_dominio_egsi FROM preguntas WHERE id_norma = 'A.5.3'").all());

db.close();
