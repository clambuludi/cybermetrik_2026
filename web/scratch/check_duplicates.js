const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

console.log("Checking A.5.1 records:");
const a51 = db.prepare("SELECT * FROM preguntas WHERE id_norma = 'A.5.1'").all();
console.log(a51);

console.log("\nChecking A.5.3 records:");
const a53 = db.prepare("SELECT * FROM preguntas WHERE id_norma = 'A.5.3'").all();
console.log(a53);

console.log("\nChecking A.5.2 records:");
const a52 = db.prepare("SELECT * FROM preguntas WHERE id_norma = 'A.5.2'").all();
console.log(a52);

db.close();
