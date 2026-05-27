const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'slug-mapping-data.json'), 'utf8'));
const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
const newQuestions = cmDb.prepare(`SELECT id_norma, pregunta FROM preguntas WHERE activo = 1`).all();
cmDb.close();

const activeSlugs = {};
newQuestions.forEach(q => {
  activeSlugs[generateId(q.pregunta)] = q.id_norma;
});

const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'));
const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
reportsDb.close();

const parsed = JSON.parse(targetReport.data);
const checkedItems = parsed.checkedItems || parsed || {};

console.log("OLD KEY | VALUE | NEW KEY | NEW ID_NORMA");
console.log("---------------------------------------");

const results = [];
for (const oldKey of Object.keys(checkedItems)) {
  const val = checkedItems[oldKey];
  const newKey = mapping[oldKey] || oldKey;
  const newIdNorma = activeSlugs[newKey];
  results.push({ oldKey, val, newKey, newIdNorma });
}

// Sort by newIdNorma to group by control domain
results.sort((a, b) => {
  if (!a.newIdNorma) return 1;
  if (!b.newIdNorma) return -1;
  return a.newIdNorma.localeCompare(b.newIdNorma, undefined, { numeric: true, sensitivity: 'base' });
});

results.forEach(r => {
  console.log(`${r.newIdNorma || 'UNMATCHED'} | val: ${r.val} | "${r.oldKey}" -> "${r.newKey}"`);
});
