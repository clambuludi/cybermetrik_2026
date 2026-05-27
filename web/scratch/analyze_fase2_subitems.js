const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta, peso_gpr FROM preguntas WHERE activo = 1 AND id_dominio_egsi = 7").all();

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

console.log(`Fase 2 rows total: ${rows.length}`);
console.log(`Parents count: ${parents.length}`);
console.log(`Subitems count: ${subitems.length}`);

// Check why the user says "subitems que son 133"
// Wait, is there a subset of subitems that are actually active or have a specific property?
// What about the total count of subitems in the whole checklist?
// Let's count how many have peso_gpr !== 0 or peso_gpr > 0.
const subitemsWithWeight = subitems.filter(s => Number(s.peso_gpr) !== 0);
console.log(`Subitems with non-zero GPR weight: ${subitemsWithWeight.length}`);

const subitemsWithZeroWeight = subitems.filter(s => Number(s.peso_gpr) === 0);
console.log(`Subitems with zero GPR weight: ${subitemsWithZeroWeight.length}`);

console.log("Subitems with zero GPR weight sample (first 10):");
subitemsWithZeroWeight.slice(0, 10).forEach(s => console.log(` - ${s.id_norma}: ${s.pregunta.substring(0, 50)}`));

db.close();
