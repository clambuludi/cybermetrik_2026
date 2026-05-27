const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

// Preview what will be deleted
const toDelete = db.prepare(`
  SELECT id, id_norma, pregunta FROM preguntas 
  WHERE id_norma LIKE 'A.5.%' 
    AND id_norma != 'A.5.1'
    AND id_norma NOT LIKE 'A.5.1.%'
  ORDER BY id_norma
`).all();

console.log(`\nSe van a ELIMINAR ${toDelete.length} registros:\n`);
toDelete.forEach(r => console.log(`  [${r.id}] ${r.id_norma} - ${(r.pregunta||'').substring(0,60)}`));

// Execute deletion
const result = db.prepare(`
  DELETE FROM preguntas 
  WHERE id_norma LIKE 'A.5.%'
    AND id_norma != 'A.5.1'
    AND id_norma NOT LIKE 'A.5.1.%'
`).run();

console.log(`\n✅ Eliminados: ${result.changes} registros`);

// Verify what remains for A.5.x
const remaining = db.prepare(`SELECT id, id_norma FROM preguntas WHERE id_norma LIKE 'A.5.%' ORDER BY id_norma`).all();
console.log(`\nQuedan en A.5.x: ${remaining.length} registros:`);
remaining.forEach(r => console.log(`  [${r.id}] ${r.id_norma}`));

db.close();
