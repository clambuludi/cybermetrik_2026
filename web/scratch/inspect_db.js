const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const allQuestions = db.prepare(`
  SELECT id_norma, activo, dominio
  FROM preguntas 
`).all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const allParents = new Set();
const activeParents = new Set();

allQuestions.forEach(item => {
  const match = item.id_norma.match(SUB_ITEM_REGEX);
  const parentId = match ? match[1] : item.id_norma;
  
  if (item.dominio && !item.dominio.includes('EGSI FASE')) {
    allParents.add(parentId);
    if (item.activo === 1) {
      activeParents.add(parentId);
    }
  }
});

console.log("All ISO parents (active + inactive):", allParents.size);
console.log("Active ISO parents:", activeParents.size);

db.close();
