const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare(`
    SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr, pregunta, activo
    FROM preguntas 
    WHERE id_norma LIKE 'A.5%' AND activo = 1
`).all();

console.log(`Found ${rows.length} active A.5 questions:`);
const summaries = rows.map(r => ({
    id: r.id,
    id_norma: r.id_norma,
    dominio: r.dominio,
    id_dominio_egsi: r.id_dominio_egsi,
    peso_gpr: r.peso_gpr,
    pregunta: r.pregunta.substring(0, 50) + "..."
}));
console.table(summaries);

db.close();
