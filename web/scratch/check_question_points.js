const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const db = new Database(dbPath);

console.log('--- ALL QUESTIONS FROM CYBERMETRIK.DB ---');
const rows = db.prepare("SELECT id, id_norma, pregunta, id_dominio_egsi, peso_gpr FROM preguntas WHERE activo = 1").all();
rows.forEach(r => {
    const id = r.pregunta.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    if (r.id_dominio_egsi >= 6 && r.id_dominio_egsi <= 9) {
        console.log(`ID: ${id} | Norma: ${r.id_norma} | EGSI: ${r.id_dominio_egsi} | Peso: ${r.peso_gpr} | Text: ${r.pregunta}`);
    }
});
db.close();
