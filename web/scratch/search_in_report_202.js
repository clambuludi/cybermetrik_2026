const Database = require('better-sqlite3');
const path = require('path');

const rDb = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });
const report = rDb.prepare("SELECT * FROM reports WHERE id = 202").get();
rDb.close();

const parsed = JSON.parse(report.data);
const checked = parsed.checkedItems || parsed;

console.log("Keys containing 'transferencia':");
Object.keys(checked).forEach(k => {
    if (k.includes('transferencia')) console.log(` - ${k}: ${checked[k]}`);
});

console.log("\nKeys containing 'acceso':");
Object.keys(checked).forEach(k => {
    if (k.includes('acceso')) console.log(` - ${k}: ${checked[k]}`);
});
