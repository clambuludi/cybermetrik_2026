const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
const dominios = cmDb.prepare("SELECT DISTINCT dominio, count(*) as count FROM preguntas WHERE activo = 1 GROUP BY dominio").all();
cmDb.close();

console.log(dominios);
