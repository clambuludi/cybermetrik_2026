const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });

try {
    const rows = db.prepare(`
        SELECT id, created_at, user_name, score, completed_count, total_count, is_finalized
        FROM reports 
        WHERE user_name = 'evaluacion@gmail.com' 
           OR user_id IN (SELECT id FROM users WHERE email = 'evaluacion@gmail.com') 
        ORDER BY id DESC
    `).all();

    console.table(rows);
} catch (e) {
    console.error(e);
}
db.close();
