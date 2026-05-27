const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE activo = 1 AND id_dominio_egsi = 7").all();

const parents = [];
const subitems = [];
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

rows.forEach(r => {
    const idNorma = r.id_norma || '';
    if (idNorma.match(SUB_ITEM_REGEX)) {
        subitems.push(r);
    } else {
        parents.push(r);
    }
});

console.log(`Total active items in Fase 2: ${rows.length}`);
console.log(`Parents in Fase 2 (count = ${parents.length}):`);
parents.forEach(p => console.log(` - ${p.id_norma}: ${p.pregunta.substring(0, 50)}`));
console.log(`Subitems in Fase 2 (count = ${subitems.length}):`);
db.close();
