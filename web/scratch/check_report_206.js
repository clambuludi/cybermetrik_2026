const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });
const report = db.prepare("SELECT * FROM reports WHERE id = 206").get();
db.close();

console.log("Report 206 Metadata:");
console.log("ID:", report.id);
console.log("User:", report.user_name);
console.log("Score:", report.score);
console.log("Completed Count:", report.completed_count);
console.log("Total Count:", report.total_count);
console.log("Is Finalized:", report.is_finalized);

const parsed = JSON.parse(report.data);
console.log("\nKeys in parsed data:", Object.keys(parsed));
if (parsed.isoScore) console.log("Saved isoScore in data:", parsed.isoScore);
if (parsed.egsiScore) console.log("Saved egsiScore in data:", parsed.egsiScore);
