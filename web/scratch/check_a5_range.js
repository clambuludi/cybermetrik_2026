const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

const rows = db.prepare(`SELECT id, id_norma, dominio, pregunta FROM preguntas WHERE id_norma LIKE 'A.5.%' ORDER BY id_norma`).all();
console.log('Total encontrados:', rows.length);
rows.forEach(r => console.log(r.id, '|', r.id_norma, '|', (r.pregunta || '').substring(0, 60)));
db.close();
