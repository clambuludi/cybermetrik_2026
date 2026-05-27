const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, dominio, peso_gpr FROM preguntas WHERE activo = 1").all();

let totalWeight = 0;
rows.forEach(r => {
  totalWeight += Number(r.peso_gpr) || 0;
});

console.log("Total active rows:", rows.length);
console.log("Total weight sum:", totalWeight);
db.close();
