const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id_norma, dominio, peso_gpr, id_dominio_egsi FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const domainWeights = {};
rows.forEach(r => {
  const dom = r.dominio;
  if (!domainWeights[dom]) domainWeights[dom] = { total: 0, count: 0 };
  domainWeights[dom].total += Number(r.peso_gpr) || 0;
  domainWeights[dom].count++;
});

console.log("All active items by domain:");
console.log(domainWeights);

db.close();
