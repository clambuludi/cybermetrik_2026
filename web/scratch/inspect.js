const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);
const rows = db.prepare("SELECT id, id_norma, dominio, pregunta FROM preguntas WHERE dominio = 'EJECUCION A5: Controles Organizacionales'").all();
console.log(`Found ${rows.length} rows`);
rows.forEach(r => {
    console.log(`ID: ${r.id} | id_norma: ${r.id_norma} | pregunta: ${r.pregunta.substring(0, 50)}...`);
});
db.close();
