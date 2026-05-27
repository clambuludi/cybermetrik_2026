const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT DISTINCT dominio FROM preguntas WHERE activo = 1").all();
console.log("Domains:", rows);

const distinctIds = db.prepare("SELECT DISTINCT id_norma FROM preguntas WHERE activo = 1 AND dominio NOT LIKE '%EGSI FASE%'").all();
console.log("Distinct id_norma (first 10):", distinctIds.slice(0, 10));

const countAnnexA = db.prepare("SELECT count(*) as count FROM preguntas WHERE activo = 1 AND (dominio LIKE '%A5%' OR dominio LIKE '%A6%' OR dominio LIKE '%A7%' OR dominio LIKE '%A8%')").get();
console.log("Count of active Annex A items in DB:", countAnnexA.count);

const countISOClausulas = db.prepare("SELECT count(*) as count FROM preguntas WHERE activo = 1 AND dominio = 'Cláusulas ISO 27001'").get();
console.log("Count of active ISO Cláusulas in DB:", countISOClausulas.count);

db.close();
