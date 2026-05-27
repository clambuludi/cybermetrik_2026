const db = require('better-sqlite3')('../instance/cybermetrik.db');

const rows = db.prepare("SELECT id, id_norma, dominio, activo FROM preguntas").all();
console.log("Total records:", rows.length);
const counts = { explicit: 0, fallback: 0 };
for (const r of rows) {
  if (r.activo !== 1) continue;
  let d = r.dominio;
  if (!d || d === 'Dominio General' || d.trim() === '') {
    const id_norma = (r.id_norma || '').toString();
    if (!id_norma.startsWith('5.') && !id_norma.startsWith('6.') && !id_norma.startsWith('7.') && !id_norma.startsWith('8.')) {
      counts.fallback++;
      console.log(`Fallback record: id=${r.id}, id_norma=${r.id_norma}`);
    }
  } else if (d === 'Cláusulas ISO 27001') {
    counts.explicit++;
  }
}
console.log(counts);
db.close();
