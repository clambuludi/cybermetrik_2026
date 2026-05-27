const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

console.log("A8 items sample:");
console.log(db.prepare("SELECT id, id_norma, dominio, pregunta FROM preguntas WHERE dominio LIKE '%A8%' OR dominio LIKE '%Tecnologicos%' LIMIT 15").all());

console.log("\nA6 items sample:");
console.log(db.prepare("SELECT id, id_norma, dominio, pregunta FROM preguntas WHERE dominio LIKE '%A6%' OR dominio LIKE '%Personas%' LIMIT 15").all());

db.close();
