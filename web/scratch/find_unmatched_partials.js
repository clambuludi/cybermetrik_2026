const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'slug-mapping-data.json'), 'utf8'));

const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'));
const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
reportsDb.close();

const parsed = JSON.parse(targetReport.data);
const progresoParcialDecimal = parsed.progresoParcialDecimal || {};

console.log("Checking keys of progresoParcialDecimal from Report 202:");
let total = 0;
let unmatched = 0;

for (const oldKey of Object.keys(progresoParcialDecimal)) {
  total++;
  const newKey = mapping[oldKey];
  if (!newKey) {
    unmatched++;
    console.log(`Unmatched partial decimal key: "${oldKey}"`);
  }
}

console.log(`Total partial decimal keys: ${total}`);
console.log(`Unmatched: ${unmatched}`);
