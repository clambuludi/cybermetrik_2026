const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../reports.db');
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables in reports.db:", tables);

tables.forEach(t => {
    const name = t.name;
    const info = db.prepare(`PRAGMA table_info(${name})`).all();
    const count = db.prepare(`SELECT count(*) as count FROM ${name}`).all()[0].count;
    console.log(`\nTable ${name} (columns: ${info.length}, rows: ${count}):`);
    console.log(info);
});
