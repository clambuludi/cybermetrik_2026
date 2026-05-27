const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE dominio = 'EJECUCION A5: Controles Organizacionales' AND activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const parentIdsWithChildren = new Set();
rows.forEach(r => {
  const match = r.id_norma.trim().match(SUB_ITEM_REGEX);
  if (match) {
    parentIdsWithChildren.add(match[1]);
  }
});

let totalItems = 0;
let parentItems = 0;
let childItems = 0;
let flatItems = 0;

rows.forEach(r => {
  const idNorma = r.id_norma.trim();
  const match = idNorma.match(SUB_ITEM_REGEX);
  if (match) {
    childItems++;
    totalItems++;
  } else if (parentIdsWithChildren.has(idNorma)) {
    parentItems++;
  } else {
    flatItems++;
    totalItems++;
  }
});

console.log("Total active rows:", rows.length);
console.log("Parent items (with children):", parentItems);
console.log("Child items:", childItems);
console.log("Flat items:", flatItems);
console.log("Calculated totalItems:", totalItems);
db.close();
