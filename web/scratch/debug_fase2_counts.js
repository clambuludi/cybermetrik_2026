const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, id_dominio_egsi, pregunta FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

for (let d = 6; d <= 9; d++) {
    const dRows = rows.filter(r => Number(r.id_dominio_egsi) === d);
    const parents = [];
    const subitems = [];
    dRows.forEach(r => {
        const idNorma = r.id_norma || '';
        if (idNorma.match(SUB_ITEM_REGEX)) {
            subitems.push(r);
        } else {
            parents.push(r);
        }
    });
    console.log(`id_dominio_egsi = ${d}: Total active = ${dRows.length}, Parents = ${parents.length}, Subitems = ${subitems.length}`);
}

db.close();
