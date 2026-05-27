const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, dominio, tipo_control, activo, id_dominio_egsi, peso_gpr, pregunta FROM preguntas WHERE activo = 1").all();

console.log('Indices 0-5:');
rows.slice(0, 5).forEach((r, idx) => {
    console.log(`Index: ${idx} | ID: ${r.id} | Norma: ${r.id_norma} | Q: ${r.pregunta}`);
});
db.close();
