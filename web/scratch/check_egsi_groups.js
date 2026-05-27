const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const summary = db.prepare(`
    SELECT id_dominio_egsi, dominio, COUNT(*) as cnt
    FROM preguntas 
    WHERE activo = 1
    GROUP BY id_dominio_egsi, dominio
    ORDER BY id_dominio_egsi
`).all();

console.table(summary);

const checkFase2 = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM preguntas
    WHERE activo = 1 AND id_dominio_egsi = 7
`).get();
console.log("Total in id_dominio_egsi = 7 (Fase 2):", checkFase2.cnt);

db.close();
