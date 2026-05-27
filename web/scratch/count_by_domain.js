const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare("SELECT dominio, count(id) as count FROM preguntas WHERE activo = 1 GROUP BY dominio").all();
console.log("=== DOMAIN COUNTS ===");
rows.forEach(r => {
  console.log(`${r.dominio}: ${r.count}`);
});
console.log("=====================");
db.close();
