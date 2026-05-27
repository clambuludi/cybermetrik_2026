const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
console.log("A.5.3 rows:", db.prepare("SELECT id, id_norma, activo, pregunta, dominio FROM preguntas WHERE id_norma = 'A.5.3'").all());
console.log("A.5.1 rows:", db.prepare("SELECT id, id_norma, activo, pregunta, dominio FROM preguntas WHERE id_norma = 'A.5.1'").all());
db.close();
