const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare("SELECT id_norma, pregunta, dominio FROM preguntas WHERE activo = 1").all();
db.close();

const isoRows = rows.filter(r => !r.id_norma.startsWith('EGSI'));

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
const childrenMap = new Map();
const parentRows = [];

isoRows.forEach(item => {
  const idNorma = item.id_norma.trim();
  const match = idNorma.match(SUB_ITEM_REGEX);
  if (match) {
    const parentId = match[1];
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId).push(item);
  } else {
    parentRows.push(item);
  }
});

console.log(`Total Parent Rows: ${parentRows.length}`);
console.log("Parents with children:");
let parentsWithChildrenCount = 0;
let parentsWithoutChildrenCount = 0;

parentRows.forEach(p => {
  const id = p.id_norma.trim();
  const children = childrenMap.get(id) || [];
  if (children.length > 0) {
    parentsWithChildrenCount++;
    console.log(` - ${id}: has ${children.length} children`);
  } else {
    parentsWithoutChildrenCount++;
    // console.log(` - ${id}: NO children`);
  }
});

console.log(`\nParents with children: ${parentsWithChildrenCount}`);
console.log(`Parents without children: ${parentsWithoutChildrenCount}`);
console.log("Total unique parents (with or without children):", parentRows.length);
