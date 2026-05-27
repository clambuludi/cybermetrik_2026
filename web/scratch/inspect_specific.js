const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

console.log("A.5.2.a details:");
console.log(db.prepare("SELECT * FROM preguntas WHERE id_norma = 'A.5.2.a'").all());

console.log("\nEGSI.4.1 details:");
console.log(db.prepare("SELECT * FROM preguntas WHERE id_norma = 'EGSI.4.1'").all());

console.log("\nAny EGSI.4 items:");
console.log(db.prepare("SELECT * FROM preguntas WHERE id_norma LIKE 'EGSI.4%'").all());

console.log("\nActive questions count per id_dominio_egsi:");
console.log(db.prepare("SELECT id_dominio_egsi, count(*) as count FROM preguntas WHERE activo = 1 GROUP BY id_dominio_egsi").all());

db.close();
