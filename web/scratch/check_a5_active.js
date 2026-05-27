const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = cmDb.prepare("SELECT id, id_norma, pregunta, peso_gpr, id_dominio_egsi FROM preguntas WHERE id_norma LIKE 'A.5.1%'").all();
console.log(rows);

cmDb.close();
