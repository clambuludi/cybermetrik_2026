const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

console.log("Checking what has less than 3 dots in id_norma:");
const rows = db.prepare("SELECT id, id_norma, dominio FROM preguntas WHERE dominio = 'EJECUCION A5: Controles Organizacionales' AND id_norma NOT LIKE '%.%.%.%'").all();
console.log(`Found ${rows.length} rows matching NOT LIKE '%.%.%.%'`);
rows.forEach(r => {
    console.log(`ID: ${r.id} | id_norma: ${r.id_norma}`);
});

db.close();
