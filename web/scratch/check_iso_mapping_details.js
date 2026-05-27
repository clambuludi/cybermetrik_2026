const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const newQuestions = cmDb.prepare(`SELECT id_norma, pregunta FROM preguntas WHERE activo = 1`).all();
cmDb.close();

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
const activeSlugs = {};
newQuestions.forEach(q => {
  activeSlugs[generateId(q.pregunta)] = q.id_norma;
});

const reportsDb = new Database(path.resolve(__dirname, '../reports.db'));
const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
reportsDb.close();

const parsed = JSON.parse(targetReport.data);
const checkedItems = parsed.checkedItems || parsed || {};

console.log("=== KEY TRANSLATION AND IDENTIFIED NORMAS ===");
for (const oldKey of Object.keys(checkedItems)) {
  const newKey = mapping[oldKey] || oldKey;
  const idNorma = activeSlugs[newKey];
  const oldNorma = activeSlugs[generateId(oldKey)];
  if (oldKey.includes('configur') || oldKey.includes('disciplin') || oldKey.includes('monito') || oldKey.includes('supervis') || (idNorma && (idNorma.startsWith('A.6') || idNorma.startsWith('A.8')))) {
    console.log(`[Norma: ${idNorma || 'NONE'} (old: ${oldNorma || 'NONE'})] val: ${checkedItems[oldKey]} | "${oldKey}" -> "${newKey}"`);
  }
}
