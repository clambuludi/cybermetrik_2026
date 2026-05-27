const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare("SELECT id_norma, pregunta, dominio FROM preguntas WHERE activo = 1").all();
db.close();

// Filter out EGSI items
const isoRows = rows.filter(r => !r.id_norma.startsWith('EGSI'));

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
const childrenMap = new Map();
const parentIds = new Set();

isoRows.forEach(item => {
  const idNorma = item.id_norma;
  if (typeof idNorma === 'string' && idNorma.trim() !== '') {
    const match = idNorma.trim().match(SUB_ITEM_REGEX);
    if (match) {
      const parentId = match[1];
      parentIds.add(parentId);
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId).push(item);
    } else {
      parentIds.add(idNorma);
    }
  }
});

console.log("=== COUNTS ===");
console.log("Total Active Questions (ISO + EGSI):", rows.length);
console.log("Total Active ISO Questions:", isoRows.length);
console.log("Total Active ISO Parent Controls (Clauses + Annex A):", parentIds.size);

// Count of parent controls in Annex A (starts with A.) and Clauses (starts with 4., 5., 6., 7., 8., 9., 10. or similar)
let annexAParents = 0;
let clauseParents = 0;
parentIds.forEach(id => {
  if (id.startsWith('A.')) {
    annexAParents++;
  } else {
    clauseParents++;
  }
});

console.log("Active ISO Annex A Parent Controls:", annexAParents);
console.log("Active ISO Clauses Parent Controls:", clauseParents);
console.log("====================");
