const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'reports.db');
const db = new Database(dbPath);

console.log('--- REPORT ID 182 ---');
const row = db.prepare("SELECT * FROM reports WHERE id = 182").get();
console.log('Report Data JSON:', row.data);
console.log('Report progresoParcialDecimal:', row.progreso_parcial_decimal);
db.close();
