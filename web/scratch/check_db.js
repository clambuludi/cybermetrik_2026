const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
console.log('Database Path:', dbPath);
const db = new Database(dbPath);

console.log('--- TABLES ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

console.log('--- PREGUNTAS COUNTS BY DOMINIO EGSI ---');
const counts = db.prepare("SELECT id_dominio_egsi, COUNT(*) as count, SUM(peso_gpr) as sum_peso FROM preguntas GROUP BY id_dominio_egsi").all();
console.log(counts);

console.log('--- TOTAL PREGUNTAS ---');
const total = db.prepare("SELECT COUNT(*) as count FROM preguntas").all();
console.log(total);
