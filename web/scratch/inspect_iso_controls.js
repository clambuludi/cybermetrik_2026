const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta, dominio, id_dominio_egsi, peso_gpr FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const parentIdsWithChildren = new Set();
rows.forEach(r => {
  const match = r.id_norma.trim().match(SUB_ITEM_REGEX);
  if (match) {
    parentIdsWithChildren.add(match[1]);
  }
});

let isoParentAndFlatCount = 0;
let isoChildCount = 0;
const isoControls = [];

rows.forEach(r => {
  const isIso = !r.dominio.includes('EGSI FASE');
  if (!isIso) return;

  const idNorma = r.id_norma.trim();
  const match = idNorma.match(SUB_ITEM_REGEX);
  
  if (match) {
    isoChildCount++;
  } else {
    isoParentAndFlatCount++;
    isoControls.push(r);
  }
});

console.log("Total ISO rows in DB:", rows.filter(r => !r.dominio.includes('EGSI FASE')).length);
console.log("ISO Parents + Flat controls count:", isoParentAndFlatCount);
console.log("ISO Child items count:", isoChildCount);
console.log("ISO Parent/Flat controls list sample (first 10):", isoControls.slice(0, 10).map(c => ({ id_norma: c.id_norma, pregunta: c.pregunta })));

db.close();
