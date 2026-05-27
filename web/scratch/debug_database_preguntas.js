const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

console.log("preguntas table schema:");
const info = db.prepare("PRAGMA table_info(preguntas)").all();
console.log(info);

console.log("\nRows where activo = 1:");
const rows = db.prepare("SELECT * FROM preguntas WHERE activo = 1").all();
console.log(`Total rows: ${rows.length}`);

// Let's count how many have id_dominio_egsi = 6, 7, 8, 9
const egsiCounts = {};
rows.forEach(r => {
    const egsiId = r.id_dominio_egsi;
    egsiCounts[egsiId] = (egsiCounts[egsiId] || 0) + 1;
});
console.log("EGSI domains count in active preguntas:", egsiCounts);

// Let's also check if there is any question in the database that has a default answer or anything strange.
// Let's print out the list of questions with their ids and weights.
rows.forEach(r => {
    if (r.id_dominio_egsi && r.id_dominio_egsi !== 7) {
        console.log(`EGSI non-Fase2 Question: ID=${r.id}, id_dominio_egsi=${r.id_dominio_egsi}, peso_gpr=${r.peso_gpr}, pregunta="${r.pregunta}"`);
    }
});
