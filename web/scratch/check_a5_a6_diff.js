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

console.log("=== A.5 KEY MAPPINGS ===");
for (const oldKey of Object.keys(checkedItems)) {
  if (oldKey.includes('a5') || oldKey.includes('a-5') || oldKey.includes('organizacion') || oldKey.includes('politica') || oldKey.includes('tarea') || oldKey.includes('autoridad') || oldKey.includes('proveedor') || oldKey.includes('nube') || oldKey.includes('incidente') || oldKey.includes('propiedad') || oldKey.includes('registro') || oldKey.includes('privacidad') || oldKey.includes('teletrabajo') || oldKey.includes('evento')) {
    const val = checkedItems[oldKey];
    const newKey = mapping[oldKey] || oldKey;
    const newIdNorma = activeSlugs[newKey];
    console.log(`OLD: "${oldKey}"\n -> NEW: "${newKey}" (${newIdNorma || 'NOT ACTIVE'})\n -> VALUE: ${val}\n`);
  }
}

console.log("\n=== A.6 KEY MAPPINGS ===");
for (const oldKey of Object.keys(checkedItems)) {
  if (oldKey.includes('a6') || oldKey.includes('a-6') || oldKey.includes('personal') || oldKey.includes('empleo') || oldKey.includes('confidencial')) {
    const val = checkedItems[oldKey];
    const newKey = mapping[oldKey] || oldKey;
    const newIdNorma = activeSlugs[newKey];
    console.log(`OLD: "${oldKey}"\n -> NEW: "${newKey}" (${newIdNorma || 'NOT ACTIVE'})\n -> VALUE: ${val}\n`);
  }
}
