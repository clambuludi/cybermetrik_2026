const Database = require('better-sqlite3');
const db = new Database('reports.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
for (const t of tables) {
    console.log(`Schema for ${t.name}:`);
    const schema = db.prepare(`PRAGMA table_info(${t.name})`).all();
    console.log(schema);
}
db.close();
