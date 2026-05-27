const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });

const rows = db.prepare("SELECT id, score, completed_count, total_count, data FROM reports WHERE id IN (202, 206)").all();
db.close();

rows.forEach(row => {
    console.log(`\n--- Report ID: ${row.id} ---`);
    console.log("Score in column:", row.score);
    console.log("CompletedCount in column:", row.completed_count);
    console.log("TotalCount in column:", row.total_count);
    const parsed = JSON.parse(row.data);
    console.log("Saved isoScore in JSON:", parsed.isoScore);
    console.log("Saved egsiScore in JSON:", parsed.egsiScore);
    console.log("Saved clausesScore in JSON:", parsed.clausesScore);
});
