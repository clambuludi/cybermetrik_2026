const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, dominio, peso_gpr FROM preguntas WHERE activo = 1 AND (dominio LIKE '%A5%' OR dominio LIKE '%A6%' OR dominio LIKE '%A7%' OR dominio LIKE '%A8%')").all();

let totalWeight = 0;
let parentIdsWithChildren = new Set();
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

rows.forEach(r => {
  const match = r.id_norma.trim().match(SUB_ITEM_REGEX);
  if (match) {
    parentIdsWithChildren.add(match[1]);
  }
});

let childrenWeightSum = 0;
let flatWeightSum = 0;
let parentWeightSum = 0;

rows.forEach(r => {
  const idNorma = r.id_norma.trim();
  const match = idNorma.match(SUB_ITEM_REGEX);
  if (match) {
    childrenWeightSum += Number(r.peso_gpr) || 0;
  } else if (parentIdsWithChildren.has(idNorma)) {
    parentWeightSum += Number(r.peso_gpr) || 0;
  } else {
    flatWeightSum += Number(r.peso_gpr) || 0;
  }
  totalWeight += Number(r.peso_gpr) || 0;
});

console.log("Total items matching Annex A:", rows.length);
console.log("Total weight sum:", totalWeight);
console.log("Children weight sum:", childrenWeightSum);
console.log("Flat weight sum:", flatWeightSum);
console.log("Parent weight sum:", parentWeightSum);
console.log("Children + Flat weight sum:", childrenWeightSum + flatWeightSum);
db.close();
