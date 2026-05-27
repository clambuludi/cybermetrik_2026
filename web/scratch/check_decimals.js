const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });

const reports = db.prepare("SELECT * FROM reports WHERE id IN (202, 206)").all();
db.close();

reports.forEach(report => {
    console.log(`\n--- Report ID: ${report.id} ---`);
    const parsed = JSON.parse(report.data);
    const decimals = parsed.progresoParcialDecimal;
    if (decimals) {
        let countPositive = 0;
        const positive = [];
        Object.keys(decimals).forEach(k => {
            if (decimals[k] > 0) {
                countPositive++;
                positive.push(`${k}: ${decimals[k]}`);
            }
        });
        console.log("Count of positive decimals in data:", countPositive);
        console.log("First 15 positive decimals in data:", positive.slice(0, 15));
    } else {
        console.log("No progresoParcialDecimal in data.");
    }
});
