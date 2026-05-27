const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });

try {
    const report = db.prepare(`
        SELECT * FROM reports 
        WHERE user_name = 'evaluacion@gmail.com' 
           OR user_id IN (SELECT id FROM users WHERE email = 'evaluacion@gmail.com') 
        ORDER BY id DESC LIMIT 1
    `).get();

    if (report) {
        console.log("Report ID:", report.id);
        console.log("Score:", report.score);
        console.log("CompletedCount:", report.completed_count);
        console.log("TotalCount:", report.total_count);
        const data = JSON.parse(report.data);
        console.log("Saved isoScore:", data.isoScore);
        console.log("Saved egsiScore:", data.egsiScore);
        console.log("Saved clausesScore:", data.clausesScore);
    } else {
        console.log("No report found for evaluacion@gmail.com");
    }
} catch (e) {
    console.error(e);
}
db.close();
