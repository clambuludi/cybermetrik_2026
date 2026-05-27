const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const user = db.prepare("SELECT * FROM users WHERE email = ?").get('prueba@gmail.com');
console.log("User prueba@gmail.com:", user);

if (user) {
    const reports = db.prepare("SELECT id, score, completed_count, total_count, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC").all(user.id);
    console.log("Reports for user:", reports);
}

db.close();
