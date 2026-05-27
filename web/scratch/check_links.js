const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });

const reports = db.prepare("SELECT * FROM reports WHERE id IN (202, 206)").all();
db.close();

reports.forEach(report => {
    console.log(`\n--- Report ID: ${report.id} ---`);
    const parsed = JSON.parse(report.data);
    const links = parsed.evidenceLinks || {};
    console.log("Count of evidence links:", Object.keys(links).length);
    console.log("Evidence links:", links);
});
