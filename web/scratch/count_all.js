const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, dominio, pregunta FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// Group by domain
const grouped = {};
rows.forEach(r => {
  const dom = r.dominio || 'General';
  if (!grouped[dom]) grouped[dom] = [];
  grouped[dom].push(r);
});

for (const [dom, items] of Object.entries(grouped)) {
  const parentIdsWithChildren = new Set();
  items.forEach(item => {
    const idNorma = item.id_norma;
    if (typeof idNorma === 'string' && idNorma.trim() !== '') {
      const match = idNorma.trim().match(SUB_ITEM_REGEX);
      if (match) {
        parentIdsWithChildren.add(match[1]);
      }
    }
  });

  let totalItems = 0;
  let skippedParents = 0;
  items.forEach(item => {
    const idNorma = item.id_norma;
    if (typeof idNorma === 'string' && parentIdsWithChildren.has(idNorma.trim())) {
      skippedParents++;
      return;
    }
    totalItems++;
  });

  console.log(`Domain: "${dom}"`);
  console.log(`  Total database rows: ${items.length}`);
  console.log(`  Skipped parent items: ${skippedParents}`);
  console.log(`  Evaluable items: ${totalItems}`);
}

db.close();
