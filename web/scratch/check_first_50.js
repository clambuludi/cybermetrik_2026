const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, dominio, tipo_control, activo, id_dominio_egsi, peso_gpr, pregunta FROM preguntas WHERE activo = 1").all();

console.log('Total active rows:', rows.length);
rows.slice(0, 50).forEach(r => {
    console.log(`ID: ${r.id} | Norma: ${r.id_norma} | Domain: ${r.dominio} | Type: ${r.tipo_control} | id_egsi: ${r.id_dominio_egsi} | peso: ${r.peso_gpr} | Q: ${r.pregunta.substring(0, 40)}`);
});
db.close();
