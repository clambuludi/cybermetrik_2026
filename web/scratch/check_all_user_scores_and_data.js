const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare(`SELECT id, id_norma, pregunta, id_dominio_egsi, peso_gpr, dominio FROM preguntas ORDER BY id_dominio_egsi, id_norma`).all();
console.log("All active questions:");
rows.forEach(r => {
    console.log(`ID: ${r.id}, id_norma: ${r.id_norma}, id_dominio_egsi: ${r.id_dominio_egsi}, peso_gpr: ${r.peso_gpr}, dominio: ${r.dominio}`);
});
sqlite.close();
