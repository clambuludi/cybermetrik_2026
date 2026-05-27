const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare(`
  SELECT id_norma, COUNT(*) as c 
  FROM preguntas 
  WHERE dominio = 'EJECUCION A5: Controles Organizacionales'
  GROUP BY id_norma 
  HAVING c > 1
`).all();
console.log("DUPLICATES:", rows);
db.close();
