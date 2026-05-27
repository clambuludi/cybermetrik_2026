const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
const counts = cmDb.prepare(`
  SELECT 
    CASE 
      WHEN id_norma LIKE 'A.5%' THEN 'A.5'
      WHEN id_norma LIKE 'A.6%' THEN 'A.6'
      WHEN id_norma LIKE 'A.7%' THEN 'A.7'
      WHEN id_norma LIKE 'A.8%' THEN 'A.8'
      ELSE 'Other'
    END as prefix,
    COUNT(*) as total,
    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as active
  FROM preguntas
  GROUP BY prefix
`).all();
cmDb.close();

console.log(counts);
