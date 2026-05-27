const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare("SELECT id, id_norma, pregunta, dominio, activo FROM preguntas WHERE activo = 1 LIMIT 30").all();
console.table(rows);
db.close();
