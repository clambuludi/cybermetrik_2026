const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const rDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const children = cmDb.prepare("SELECT id, id_norma, pregunta, activo, id_dominio_egsi, dominio FROM preguntas WHERE id_norma LIKE 'A.5.1%'").all();
console.log("A.5.1 questions in DB:", children);

const report = rDb.prepare("SELECT * FROM reports WHERE id = 206").get();
const parsed = JSON.parse(report.data);
const completed = parsed.checkedItems || parsed || {};
const evidenceLinks = parsed.evidenceLinks || {};

console.log("\nChecked items & links for these questions:");
children.forEach(c => {
    const id = c.pregunta.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    console.log(`ID: ${id}`);
    console.log(`  - id_norma: ${c.id_norma}`);
    console.log(`  - checked: ${completed[id]}`);
    console.log(`  - link: ${evidenceLinks[id]}`);
});

cmDb.close();
rDb.close();
