const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
const rows = db.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE id_norma LIKE 'A.6.%' ORDER BY id_norma").all();
db.close();
rows.forEach(r => {
  console.log(`${r.id_norma} | ${r.id} | ${r.pregunta}`);
});
