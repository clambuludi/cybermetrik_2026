const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath);

console.log("Running temporary purge query directly...");
const result = sqlite.prepare("DELETE FROM preguntas WHERE dominio = 'EJECUCION A5: Controles Organizacionales' AND id_norma NOT LIKE '%.%.%.%'").run();
console.log(`Successfully purged ${result.changes} macro control rows!`);

sqlite.close();
