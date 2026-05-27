const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'slug-mapping-data.json'), 'utf8'));

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

// Load active questions from cybermetrik.db
const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
const rows = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
cmDb.close();

const activeSlugs = new Set(rows.map(r => generateId(r.pregunta)));

const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'));
const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
reportsDb.close();

const parsed = JSON.parse(targetReport.data);
const checkedItems = parsed.checkedItems || parsed || {};

console.log("Checking keys of checkedItems from Report 202:");
let totalChecked = 0;
let matchedCount = 0;
let unmatchedCount = 0;

for (const oldKey of Object.keys(checkedItems)) {
  const isChecked = checkedItems[oldKey];
  // If it's checked/partial (not false/0)
  if (isChecked) {
    totalChecked++;
    const newKey = mapping[oldKey] || oldKey;
    if (activeSlugs.has(newKey)) {
      matchedCount++;
    } else {
      unmatchedCount++;
      console.log(`Unmatched checked key: "${oldKey}" -> "${newKey}" (value: ${isChecked})`);
    }
  }
}

console.log(`\nSummary:`);
console.log(`Total checked/partial keys: ${totalChecked}`);
console.log(`Matched with active database questions: ${matchedCount}`);
console.log(`Unmatched: ${unmatchedCount}`);
