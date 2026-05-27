const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

const allActive = db.prepare("SELECT id, id_norma, dominio, pregunta FROM preguntas WHERE activo = 1").all();
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const parentIdsWithChildren = new Set();
allActive.forEach(item => {
  const idNorma = item.id_norma;
  if (typeof idNorma === 'string' && idNorma.trim() !== '') {
    const match = idNorma.trim().match(SUB_ITEM_REGEX);
    if (match) {
      parentIdsWithChildren.add(match[1]);
    }
  }
});

let annexACount = 0;
let clauseCount = 0;
let egsiCount = 0;

allActive.forEach(item => {
  const idNorma = item.id_norma.trim();
  if (parentIdsWithChildren.has(idNorma)) {
    return; // Skip parent controls
  }
  if (idNorma.startsWith('A.')) {
    annexACount++;
  } else if (idNorma.startsWith('EGSI.')) {
    egsiCount++;
  } else {
    clauseCount++;
  }
});

console.log("Annex A count (starts with A.):", annexACount);
console.log("EGSI count (starts with EGSI.):", egsiCount);
console.log("ISO Clauses count (other):", clauseCount);

db.close();
