const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr FROM preguntas WHERE activo = 1").all();

let totalIsoWeight = 0;
let validIsoItemsCount = 0;

rows.forEach(r => {
  const isIsoSection = !r.dominio.includes('EGSI FASE');
  if (isIsoSection) {
    totalIsoWeight += Number(r.peso_gpr) || 0;
    validIsoItemsCount++;
  }
});

console.log("Total ISO items count:", validIsoItemsCount);
console.log("Total ISO GPR weight sum:", totalIsoWeight);
db.close();
