const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath);

console.log("Iniciando migración GPR...");

try {
  // 1. ALTER TABLE
  try {
    db.exec(`ALTER TABLE preguntas ADD COLUMN peso_gpr DECIMAL(5,2) DEFAULT 0.00;`);
    console.log("✔️ Columna 'peso_gpr' agregada con éxito.");
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log("✔️ La columna 'peso_gpr' ya existe. Omitiendo ALTER TABLE.");
    } else {
      throw e;
    }
  }

  // Reset all weights to 0.00 first
  db.exec(`UPDATE preguntas SET peso_gpr = 0.00;`);

  // 2. MASS UPDATE - Planeación (Fase 1)
  db.prepare(`UPDATE preguntas SET peso_gpr = 2.00 WHERE id_norma = 'EGSI.1.1'`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 6.00 WHERE id_norma = 'EGSI.1.2'`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 4.00 WHERE id_norma = 'EGSI.1.3'`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 4.00 WHERE id_norma = 'EGSI.1.4'`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 7.00 WHERE id_norma IN ('4.1a', '4.2a', '4.3a', '4.4a')`).run();
  
  // Riesgos
  db.prepare(`UPDATE preguntas SET peso_gpr = 10.00 WHERE id_norma IN ('6.1.1', '6.1.2')`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 12.00 WHERE id_norma = '6.1.3'`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 2.00 WHERE id_norma = '6.1.4'`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 3.00 WHERE id_norma = '6.2'`).run();

  // 3. MASS UPDATE - Ejecución (Fase 2)
  db.prepare(`UPDATE preguntas SET peso_gpr = 0.43 WHERE id_norma LIKE 'A.5.%' OR id_norma LIKE 'A.6.%' OR id_norma LIKE 'A.7.%' OR id_norma LIKE 'A.8.%'`).run();
  
  // 4. MASS UPDATE - Control y Monitoreo (Fase 3/Final Ejecución)
  db.prepare(`UPDATE preguntas SET peso_gpr = 1.00 WHERE id_norma = '9.1a'`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 2.00 WHERE id_norma IN ('9.2a', '9.2b')`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 2.00 WHERE id_norma IN ('9.3a', '9.3b')`).run();
  db.prepare(`UPDATE preguntas SET peso_gpr = 2.00 WHERE id_norma IN ('10.1a', '10.2a')`).run();

  // 5. MASS UPDATE - Cierre (Fase 4)
  db.prepare(`UPDATE preguntas SET peso_gpr = 1.00 WHERE id_norma = 'EGSI.4.1'`).run();

  console.log("✔️ Pesos GPR actualizados exitosamente en la base de datos.");

} catch (err) {
  console.error("❌ Error durante la migración GPR:", err.message);
} finally {
  db.close();
}
