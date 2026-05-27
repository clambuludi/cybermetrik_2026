const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// Identify parents with children
const parentIdsWithChildren = new Set();
rows.forEach(r => {
  const match = r.id_norma.trim().match(SUB_ITEM_REGEX);
  if (match) {
    parentIdsWithChildren.add(match[1]);
  }
});

let egsiTotalWeight = 0;
let itemsInEgsi = 0;
const a51_items = [];

rows.forEach(r => {
  const idNorma = r.id_norma.trim();
  if (parentIdsWithChildren.has(idNorma)) {
    return; // Skip parent items
  }

  const idEgsi = Number(r.id_dominio_egsi);
  const peso = Number(r.peso_gpr) || 0;
  if (idEgsi >= 6 && idEgsi <= 9) {
    egsiTotalWeight += peso;
    itemsInEgsi++;
    if (idNorma.startsWith('A.5.1.')) {
      a51_items.push(r);
    }
  }
});

console.log("EGSI Total Weight (Denominator):", egsiTotalWeight);
console.log("Items participating in EGSI calculation:", itemsInEgsi);
console.log("A.5.1 sub-items:", a51_items);

const a51_obtained = a51_items.reduce((acc, curr) => acc + (1.0 * curr.peso_gpr), 0);
console.log("A.5.1 obtained EGSI points (3 x weight):", a51_obtained);
console.log("EGSI Score %:", (a51_obtained / egsiTotalWeight) * 100);

db.close();
