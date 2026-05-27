const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const totalWeight = db.prepare("SELECT SUM(peso_gpr) as total FROM preguntas WHERE activo = 1").get();
console.log("Total peso_gpr in database:", totalWeight.total);

const isoWeight = db.prepare("SELECT SUM(peso_gpr) as total FROM preguntas WHERE activo = 1 AND (dominio NOT LIKE '%EGSI FASE%')").get();
console.log("ISO only peso_gpr in database:", isoWeight.total);

const egsiWeight = db.prepare("SELECT SUM(peso_gpr) as total FROM preguntas WHERE activo = 1 AND (dominio LIKE '%EGSI FASE%')").get();
console.log("EGSI only peso_gpr in database:", egsiWeight.total);

db.close();
