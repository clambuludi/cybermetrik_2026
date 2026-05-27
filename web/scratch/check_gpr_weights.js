const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT * FROM preguntas").all();
console.log('Total questions in DB:', rows.length);

const gprQuestions = rows.filter(r => r.id_dominio_egsi >= 6 && r.id_dominio_egsi <= 9);
console.log('Total EGSI questions:', gprQuestions.length);

const weights = {};
gprQuestions.forEach(q => {
    weights[q.peso_gpr] = (weights[q.peso_gpr] || 0) + 1;
});
console.log('Weights distribution:', weights);

db.close();
