const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// Identify all macro controls (parents or flat)
const parentIds = new Set();
const childMap = {};

rows.forEach(r => {
  const match = r.id_norma.trim().match(SUB_ITEM_REGEX);
  if (match) {
    const parentId = match[1];
    if (!childMap[parentId]) childMap[parentId] = [];
    childMap[parentId].push(r);
  } else {
    parentIds.add(r.id_norma.trim());
  }
});

// For each macro control, determine its weight and score
const macroControls = [];
let totalWeights = 0;

rows.forEach(r => {
  const idNorma = r.id_norma.trim();
  const isChild = idNorma.match(SUB_ITEM_REGEX);
  if (isChild) return; // Skip children

  // It's a macro control
  const children = childMap[idNorma] || [];
  let weight = 0;
  if (children.length > 0) {
    // If it has children, its weight is the weight of any child (e.g. 0.43)
    weight = Number(children[0].peso_gpr) || 0;
  } else {
    // If flat, its weight is its own weight
    weight = Number(r.peso_gpr) || 0;
  }

  totalWeights += weight;
  macroControls.push({
    id_norma: idNorma,
    dominio: r.dominio,
    weight: weight,
    hasChildren: children.length > 0,
    childrenCount: children.length
  });
});

console.log("Total macro controls:", macroControls.length);
console.log("Sum of weights of all macro controls:", totalWeights);
console.log("Sample of macro controls:");
console.log(macroControls.slice(0, 15));

db.close();
