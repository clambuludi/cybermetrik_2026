const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'reports.db');
const db = new Database(dbPath);

console.log('--- REPORTS FOR CARLOS AMBULUDI (USER 38) ---');
const rows = db.prepare("SELECT * FROM reports WHERE user_id = 38").all();
rows.forEach(r => {
    console.log(`Report ID: ${r.id} | score: ${r.score} | completedCount: ${r.completed_count} | totalCount: ${r.total_count} | isFinalized: ${r.is_finalized}`);
    console.log('Data sample:', r.data.substring(0, 100));
});
db.close();
