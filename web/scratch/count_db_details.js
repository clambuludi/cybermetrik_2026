const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare("SELECT id_norma, pregunta, dominio FROM preguntas WHERE activo = 1").all();
db.close();

const isoRows = rows.filter(r => !r.id_norma.startsWith('EGSI'));

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

let parentRowsCount = 0;
let subItemRowsCount = 0;
let otherRowsCount = 0;

isoRows.forEach(r => {
  const idNorma = r.id_norma.trim();
  if (idNorma.match(SUB_ITEM_REGEX)) {
    subItemRowsCount++;
  } else {
    parentRowsCount++;
  }
});

console.log("=== DB ISO ROW DETAILS ===");
console.log("Total ISO rows in DB:", isoRows.length);
console.log("Sub-item rows (e.g., A.5.1.a):", subItemRowsCount);
console.log("Parent rows (e.g., A.5.1):", parentRowsCount);
console.log("==========================");
