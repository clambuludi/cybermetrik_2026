const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare("SELECT id_norma, pregunta, dominio FROM preguntas WHERE activo = 1").all();
db.close();

// Filter out EGSI items
const isoRows = rows.filter(r => !r.id_norma.startsWith('EGSI'));

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
const childrenMap = new Map();
const parentItems = [];

isoRows.forEach(item => {
  const idNorma = item.id_norma;
  if (typeof idNorma === 'string' && idNorma.trim() !== '') {
    const match = idNorma.trim().match(SUB_ITEM_REGEX);
    if (match) {
      const parentId = match[1];
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId).push(item);
    } else {
      parentItems.push(item);
    }
  } else {
    parentItems.push(item);
  }
});

let leafItemsCount = 0;
let details = [];

// For parents that have children, the children are the leaves.
// For parents that do not have children, the parent itself is the leaf.
const processedParents = new Set();
isoRows.forEach(item => {
  const idNorma = item.id_norma;
  const match = idNorma.match(SUB_ITEM_REGEX);
  if (match) {
    const parentId = match[1];
    if (!processedParents.has(parentId)) {
      processedParents.add(parentId);
      const children = childrenMap.get(parentId) || [];
      leafItemsCount += children.length;
      details.push(`Parent ${parentId} has ${children.length} sub-items`);
    }
  } else {
    const children = childrenMap.get(idNorma) || [];
    if (children.length === 0) {
      leafItemsCount++;
      details.push(`Parent ${idNorma} has no sub-items (leaf)`);
    }
  }
});

console.log("=== LEAF ITEMS COUNT ===");
console.log("Total Leaf Items (ISO):", leafItemsCount);
console.log("========================");
