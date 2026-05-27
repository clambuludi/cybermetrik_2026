const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
console.log(db.prepare("SELECT id, id_norma FROM preguntas WHERE dominio = 'EJECUCION A5: Controles Organizacionales'").all());
db.close();
