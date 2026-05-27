const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare(`
    SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr, activo 
    FROM preguntas 
    WHERE activo = 1
`).all();

const groups = {};
rows.forEach(r => {
    const key = r.id_dominio_egsi;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r.id_norma);
});

console.log("Mappings of id_dominio_egsi to id_norma prefixes:");
for (const [key, idNormas] of Object.entries(groups)) {
    console.log(`id_dominio_egsi = ${key}: count = ${idNormas.length}`);
    // Group by prefix (e.g., A.5, 9., A.6 etc)
    const prefixes = {};
    idNormas.forEach(id => {
        const prefix = id.split('.')[0] + '.' + (id.split('.')[1] || '').substring(0, 1);
        prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    });
    console.log("  Prefixes:", prefixes);
}

db.close();
