const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

const rows = db.prepare("SELECT id, id_norma, pregunta, id_dominio_egsi FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// Identify all parent IDs that have children
const parentIds = new Set();
rows.forEach(r => {
  const match = r.id_norma.trim().match(SUB_ITEM_REGEX);
  if (match) {
    parentIds.add(match[1]);
  }
});

// Count active items in Fase 2 (id_dominio_egsi = 7)
let totalFase2Items = 0;
let parentFase2Items = 0;
let leafFase2Items = 0;

rows.forEach(r => {
  if (Number(r.id_dominio_egsi) !== 7) return;
  totalFase2Items++;
  const idNorma = r.id_norma.trim();
  const isParent = parentIds.has(idNorma);
  if (isParent) {
    parentFase2Items++;
  } else {
    leafFase2Items++;
  }
});

console.log("Fase 2 Total Items in active DB:", totalFase2Items);
console.log("Fase 2 Parent Items:", parentFase2Items);
console.log("Fase 2 Leaf Items (actual answerable controls):", leafFase2Items);

db.close();
