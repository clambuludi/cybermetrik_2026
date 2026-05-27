const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
const rows = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
cmDb.close();

// Agrupamos las preguntas por dominio para formar las secciones
const grouped = rows.reduce((acc, row) => {
  let dom = row.dominio;
  
  if (!dom || dom === 'Dominio General' || dom.trim() === '') {
    const id_norma = (row.id_norma || '').toString();
    if (id_norma.startsWith('5.')) {
      dom = 'Dominio 5: Organizacional';
    } else if (id_norma.startsWith('6.')) {
      dom = 'Dominio 6: Personas';
    } else if (id_norma.startsWith('7.')) {
      dom = 'Dominio 7: Físico';
    } else if (id_norma.startsWith('8.')) {
      dom = 'Dominio 8: Tecnológico';
    } else {
      dom = 'Cláusulas ISO 27001';
    }
  }

  if (!acc[dom]) acc[dom] = [];
  acc[dom].push({
    point: row.pregunta,
    id_norma: row.id_norma,
    id_dominio_egsi: row.id_dominio_egsi,
    peso_gpr: row.peso_gpr,
    sectionTitle: dom
  });
  return acc;
}, {});

const allItems = [];
for (const [dom, items] of Object.entries(grouped)) {
  allItems.push(...items);
}

const isoGroups = [
    'A5: Controles Organizacionales',
    'A6: Controles Personales',
    'A7: Controles Físico',
    'A8: Controles Tecnologicos',
    'Cláusulas ISO 27001'
];

isoGroups.forEach(dom => {
    const items = allItems.filter(i => i.sectionTitle === dom || i.sectionTitle.includes(dom));
    console.log(`Group: "${dom}" -> Count: ${items.length}`);
});
console.log("\nAll unique section titles in allItems:");
const uniqueTitles = [...new Set(allItems.map(i => i.sectionTitle))];
console.log(uniqueTitles);
