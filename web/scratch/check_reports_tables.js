const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'reports.db');
const db = new Database(dbPath);

console.log('--- ALL TABLES IN REPORTS.DB ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);
db.close();
