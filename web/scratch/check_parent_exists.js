const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
const row = db.prepare("SELECT * FROM preguntas WHERE id_norma = 'A.5.1'").get();
console.log("A.5.1:", row);
const row2 = db.prepare("SELECT * FROM preguntas WHERE id_norma = 'A.5.2'").get();
console.log("A.5.2:", row2);
db.close();
