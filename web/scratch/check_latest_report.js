const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

console.log('--- ALL USERS ---');
const users = db.prepare("SELECT id, name, email, role FROM users").all();
console.table(users);

console.log('--- RECENT REPORTS ---');
const reports = db.prepare(`
    SELECT id, user_id, user_name, score, completed_count, total_count, is_finalized, created_at 
    FROM reports 
    ORDER BY created_at DESC 
    LIMIT 5
`).all();
console.table(reports);

db.close();
