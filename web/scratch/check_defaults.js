const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const db = new Database(dbPath);

console.log('--- ALL TABLES IN CYBERMETRIK.DB ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

for (const t of tables) {
    console.log(`Schema of table ${t.name}:`);
    console.log(db.prepare(`PRAGMA table_info(${t.name})`).all());
    console.log(`Row count of ${t.name}:`, db.prepare(`SELECT count(*) as count FROM ${t.name}`).get().count);
}
db.close();
