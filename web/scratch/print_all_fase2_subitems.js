const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE activo = 1 AND id_dominio_egsi = 7").all();

const childrenMap = new Map();
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const subitems = [];
rows.forEach(item => {
    const idNorma = item.id_norma || '';
    if (idNorma.trim().match(SUB_ITEM_REGEX)) {
        subitems.push(item);
    }
});

console.log(`Subitems count in Fase 2: ${subitems.length}`);
subitems.forEach(s => console.log(` - ${s.id_norma}: ${s.pregunta.substring(0, 50)}`));

db.close();
