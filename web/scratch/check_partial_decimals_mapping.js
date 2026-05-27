const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'slug-mapping-data.json'), 'utf8'));

const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'));
const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
reportsDb.close();

const parsed = JSON.parse(targetReport.data);
const progresoParcialDecimal = parsed.progresoParcialDecimal || {};

console.log("OLD KEY | VALUE | MAPPED KEY");
console.log("----------------------------");
for (const key of Object.keys(progresoParcialDecimal)) {
  const val = progresoParcialDecimal[key];
  const mapped = mapping[key] || key;
  console.log(`"${key}" | ${val} | "${mapped}"`);
}
