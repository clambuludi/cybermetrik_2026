const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
console.log(db.prepare("SELECT id, id_norma, activo, pregunta FROM preguntas WHERE id_norma LIKE 'A.5.1%' OR id_norma LIKE 'A.5.2%'").all());
db.close();
