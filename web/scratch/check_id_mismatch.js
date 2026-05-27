const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const cmRows = cmDb.prepare("SELECT * FROM preguntas WHERE activo = 1").all();
cmDb.close();

const rDb = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });
const report = rDb.prepare("SELECT * FROM reports WHERE id = 202").get();
rDb.close();

const parsed = JSON.parse(report.data);
const checked = parsed.checkedItems || parsed;

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

let matchedCount = 0;
let unmatchedCount = 0;
const unmatchedItems = [];

cmRows.forEach(row => {
    const id = generateId(row.pregunta);
    if (checked[id] !== undefined) {
        matchedCount++;
    } else {
        unmatchedCount++;
        unmatchedItems.push({
            id_norma: row.id_norma,
            pregunta: row.pregunta,
            generatedId: id
        });
    }
});

console.log("Matched items in Report 202:", matchedCount);
console.log("Unmatched items in Report 202:", unmatchedCount);
console.log("\nFirst 10 unmatched items:");
console.table(unmatchedItems.slice(0, 10));
