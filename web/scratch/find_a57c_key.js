const Database = require('better-sqlite3');
const path = require('path');

const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const report = reportsDb.prepare("SELECT id, data FROM reports WHERE id = 208").get();

const data = JSON.parse(report.data);
console.log("=== KEYS CONTAINING 'comparte' ===");
for (const k of Object.keys(data)) {
    if (k.includes("comparte")) {
        console.log(`Key: "${k}"`);
        console.log(`Value:`, data[k]);
    }
}

if (data.checkedItems) {
    console.log("=== checkedItems KEYS CONTAINING 'comparte' ===");
    for (const k of Object.keys(data.checkedItems)) {
        if (k.includes("comparte")) {
            console.log(`Key: "${k}"`);
            console.log(`Value:`, data.checkedItems[k]);
        }
    }
}

reportsDb.close();
