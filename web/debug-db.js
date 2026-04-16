const Database = require('better-sqlite3');
const db = new Database('reports.db');

try {
    const reports = db.prepare('SELECT * FROM reports').all();
    console.log('REPORTS_START');
    console.log(JSON.stringify(reports));
    console.log('REPORTS_END');
} catch (e) {
    console.error('Error reading reports:', e);
} finally {
    db.close();
}
