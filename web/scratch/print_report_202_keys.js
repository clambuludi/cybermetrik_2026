const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });
const report = db.prepare("SELECT * FROM reports WHERE id = 202").get();
db.close();

const parsed = JSON.parse(report.data);
const checkedItems = parsed.checkedItems || parsed;

console.log("Total keys:", Object.keys(checkedItems).length);
console.log(Object.keys(checkedItems));
