const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'reports.db');
const db = new Database(dbPath);

console.log('--- ALL USERS ---');
const users = db.prepare("SELECT * FROM users").all();
console.log(users);
db.close();
