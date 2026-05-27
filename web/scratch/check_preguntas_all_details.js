const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare(`SELECT id, id_norma, pregunta, tipo_control FROM preguntas WHERE activo = 1 AND id_dominio_egsi = 7`).all();
console.log(`Total questions in Fase 2: ${rows.length}`);
console.log("First 15 items:");
console.log(rows.slice(0, 15));
console.log("Items with letter at end of id_norma:");
console.log(rows.filter(r => /[a-z]$/i.test(r.id_norma)));
sqlite.close();
