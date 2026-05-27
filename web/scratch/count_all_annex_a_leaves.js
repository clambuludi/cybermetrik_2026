const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

const subItemRegex = /^(.+?\d+)\.?([a-z])$/;

function analyzeDomain(domainName) {
  const rows = db.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE dominio = ? AND activo = 1").all(domainName);
  
  const parentIdsWithChildren = new Set();
  rows.forEach(r => {
    const match = r.id_norma.trim().match(subItemRegex);
    if (match) {
      parentIdsWithChildren.add(match[1]);
    }
  });

  let childItems = 0;
  let flatItems = 0;
  let parentItems = 0;

  rows.forEach(r => {
    const idNorma = r.id_norma.trim();
    const match = idNorma.match(subItemRegex);
    if (match) {
      childItems++;
    } else if (parentIdsWithChildren.has(idNorma)) {
      parentItems++;
    } else {
      flatItems++;
    }
  });

  const totalLeaves = childItems + flatItems;
  const totalParents = parentItems + flatItems;

  console.log(`Domain: "${domainName}"`);
  console.log(`  Total active rows: ${rows.length}`);
  console.log(`  Parents with children: ${parentItems}`);
  console.log(`  Child items (leaves): ${childItems}`);
  console.log(`  Flat items (leaves): ${flatItems}`);
  console.log(`  Total Leaves (child + flat): ${totalLeaves}`);
  console.log(`  Total Parents (parent + flat): ${totalParents}`);
  console.log("------------------------------------------");
}

const domains = [
  'EJECUCION A5: Controles Organizacionales',
  'EJECUCION A6: Controles Personales',
  'EJECUCION A7: Controles Físico',
  'EJECUCION A8: Controles Tecnologicos',
  'Cláusulas ISO 27001'
];

domains.forEach(analyzeDomain);
db.close();
