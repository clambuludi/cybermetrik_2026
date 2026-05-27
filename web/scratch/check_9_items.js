const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare(`SELECT * FROM preguntas WHERE id_norma LIKE '9%'`).all();
console.log(rows);
sqlite.close();
