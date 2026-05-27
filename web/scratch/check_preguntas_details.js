const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare(`SELECT DISTINCT id_norma, id_dominio_egsi, dominio FROM preguntas WHERE activo = 1 LIMIT 50`).all();
console.log(rows);
sqlite.close();
