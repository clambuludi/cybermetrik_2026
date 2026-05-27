const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare(`
    SELECT * FROM preguntas WHERE id_norma IN ('9.1a', '9.2a', '9.2b', '9.1', '9.2')
`).all();

console.log("Check for 9.1/9.2 items in database:");
console.log(rows);
db.close();
