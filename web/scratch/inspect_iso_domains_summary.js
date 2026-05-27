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

const summary = {};

rows.forEach(r => {
  const dom = r.dominio;
  if (!summary[dom]) {
    summary[dom] = { total: 0, parents: 0, children: 0, flats: 0 };
  }
  summary[dom].total++;
  
  const idNorma = r.id_norma.trim();
  const match = idNorma.match(SUB_ITEM_REGEX);
  if (match) {
    summary[dom].children++;
  } else if (parentIdsWithChildren.has(idNorma)) {
    summary[dom].parents++;
  } else {
    summary[dom].flats++;
  }
});

console.log("Summary of active questions by domain:");
console.table(summary);

let totalControlsAll = 0;
let totalControlsISO = 0;

rows.forEach(r => {
  const idNorma = r.id_norma.trim();
  const match = idNorma.match(SUB_ITEM_REGEX);
  if (match) return; // Skip child items

  totalControlsAll++;
  if (!r.dominio.includes('EGSI FASE')) {
    totalControlsISO++;
  }
});

console.log("Total controls (Parents + Flats) in entire DB:", totalControlsAll);
console.log("Total controls (Parents + Flats) in ISO:", totalControlsISO);

db.close();
