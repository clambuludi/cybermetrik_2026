const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath);

console.log("Iniciando corrección estricta de Fase 3...");

try {
  // 1. UPDATE: Intentar forzar actualización si ya existen
  const updateStmt = db.prepare(`UPDATE preguntas SET id_dominio_egsi = 8, peso_gpr = ? WHERE id_norma = ?`);
  
  let res1 = updateStmt.run(1.00, '9.1a');
  let res2 = updateStmt.run(2.00, '9.2a');
  let res3 = updateStmt.run(2.00, '9.2b');

  // 2. INSERT: Si no existían (0 filas afectadas), inyectamos los controles oficiales
  const insertStmt = db.prepare(`INSERT INTO preguntas (id_norma, tipo_control, pregunta, dominio, id_dominio_egsi, peso_gpr, activo) VALUES (?, ?, ?, ?, ?, ?, ?)`);

  if (res1.changes === 0) {
    insertStmt.run('9.1a', 'Evaluación y Desempeño', '¿La organización realiza el seguimiento, medición, análisis y evaluación del desempeño de la seguridad de la información?', 'Cláusulas ISO 27001', 8, 1.00, 1);
    console.log("✔️ Control faltante '9.1a' inyectado.");
  } else {
    console.log("✔️ Control '9.1a' actualizado exitosamente.");
  }

  if (res2.changes === 0) {
    insertStmt.run('9.2a', 'Auditoría Interna', '¿Se planifican, establecen, implementan y mantienen programas de auditoría interna de seguridad de la información?', 'Cláusulas ISO 27001', 8, 2.00, 1);
    console.log("✔️ Control faltante '9.2a' inyectado.");
  } else {
    console.log("✔️ Control '9.2a' actualizado exitosamente.");
  }

  if (res3.changes === 0) {
    insertStmt.run('9.2b', 'Auditoría Interna', '¿Se definen los criterios y alcances de auditoría, garantizando resultados objetivos, imparciales y reportados a la dirección?', 'Cláusulas ISO 27001', 8, 2.00, 1);
    console.log("✔️ Control faltante '9.2b' inyectado.");
  } else {
    console.log("✔️ Control '9.2b' actualizado exitosamente.");
  }

  console.log("✔️ Asignación de Fase 3 (Control) corregida exitosamente en BD.");
} catch(e) {
  console.error("❌ Error en la corrección:", e.message);
} finally {
  db.close();
}
