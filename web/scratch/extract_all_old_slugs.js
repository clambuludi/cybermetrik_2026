const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });
const reports = db.prepare("SELECT data FROM reports").all();
db.close();

const allKeys = new Set();
reports.forEach(r => {
    try {
        const parsed = JSON.parse(r.data);
        const checked = parsed.checkedItems || parsed;
        Object.keys(checked).forEach(k => allKeys.add(k));
    } catch (_) {}
});

console.log(`Found ${allKeys.size} unique keys in report histories:`);
console.log(Array.from(allKeys).sort());
