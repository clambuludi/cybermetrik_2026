const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta, dominio FROM preguntas WHERE activo = 1 AND dominio = 'Cláusulas ISO 27001'").all();
console.log("Total active rows under Cláusulas ISO 27001:", rows.length);
console.log("Rows:");
rows.forEach(r => {
    console.log(`- ID: ${r.id}, Norma: ${r.id_norma}, Pregunta: ${r.pregunta}`);
});

db.close();
