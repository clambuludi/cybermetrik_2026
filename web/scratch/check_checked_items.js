const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });

const reports = db.prepare("SELECT * FROM reports WHERE id IN (202, 206)").all();
db.close();

reports.forEach(report => {
    console.log(`\n--- Report ID: ${report.id} ---`);
    const parsed = JSON.parse(report.data);
    const checked = parsed.checkedItems || parsed;
    
    // Count keys with value > 0
    let countPositive = 0;
    const positiveKeys = [];
    Object.keys(checked).forEach(k => {
        const val = checked[k];
        const numVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        if (numVal > 0) {
            countPositive++;
            positiveKeys.push(`${k}: ${val}`);
        }
    });
    console.log("Count of positive checked items:", countPositive);
    console.log("First 15 positive items:", positiveKeys.slice(0, 15));
});
