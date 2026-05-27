const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

const result = db.prepare(`
    SELECT id_dominio_egsi, typeof(id_dominio_egsi), count(*) as count 
    FROM preguntas 
    WHERE activo = 1
    GROUP BY id_dominio_egsi
`).all();

console.log("Groups by id_dominio_egsi after update:", result);

db.close();
