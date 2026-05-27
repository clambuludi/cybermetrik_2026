const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath);

console.log("Iniciando migración EGSI v3.0...");

try {
  // 1. ALTER TABLE
  try {
    db.exec(`ALTER TABLE preguntas ADD COLUMN id_dominio_egsi INTEGER NULL;`);
    console.log("✔️ Columna 'id_dominio_egsi' agregada con éxito.");
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log("✔️ La columna 'id_dominio_egsi' ya existe. Omitiendo ALTER TABLE.");
    } else {
      throw e;
    }
  }

  // 2. MASS UPDATE
  const updateFase2 = db.prepare(`UPDATE preguntas SET id_dominio_egsi = 7 WHERE id_norma LIKE 'A.5.%' OR id_norma LIKE 'A.6.%' OR id_norma LIKE 'A.7.%' OR id_norma LIKE 'A.8.%'`);
  const res2 = updateFase2.run();
  console.log(`✔️ Actualizadas ${res2.changes} filas para la Fase 2 (Ejecución).`);

  const updateFase3 = db.prepare(`UPDATE preguntas SET id_dominio_egsi = 8 WHERE id_norma LIKE '9.1%' OR id_norma LIKE '9.2%'`);
  const res3 = updateFase3.run();
  console.log(`✔️ Actualizadas ${res3.changes} filas para la Fase 3 (Control).`);

  const updateFase4 = db.prepare(`UPDATE preguntas SET id_dominio_egsi = 9 WHERE id_norma LIKE '10.%' OR id_norma = '9.3a' OR id_norma = '9.3b'`);
  const res4 = updateFase4.run();
  console.log(`✔️ Actualizadas ${res4.changes} filas para la Fase 4 (Cierre).`);

  // 3. INSERT NEW RECORDS
  const insertStmt = db.prepare(`INSERT INTO preguntas (id_norma, dominio, tipo_control, pregunta, id_dominio_egsi, activo, version) VALUES (?, ?, ?, ?, ?, 1, 'EGSIv3')`);
  
  const newRecords = [
    ['EGSI.1.1', 'EGSI FASE 1: PLANIFICACIÓN', 'Control Gubernamental', '¿Se encuentra designado formalmente el Oficial de Seguridad de la Información (OSI) mediante acto administrativo institucional?', 6],
    ['EGSI.1.2', 'EGSI FASE 1: PLANIFICACIÓN', 'Control Gubernamental', '¿Se encuentra conformado y operativo el Comité de Seguridad de la Información de la institución pública?', 6],
    ['EGSI.1.3', 'EGSI FASE 1: PLANIFICACIÓN', 'Control Legal', '¿El alcance del SGSI/EGSI incluye a todos los servicios gubernamentales digitales críticos prestados por la entidad?', 6],
    ['EGSI.1.4', 'EGSI FASE 1: PLANIFICACIÓN', 'Control Estratégico', '¿Existe un Plan de Seguridad de la Información (PSSI) aprobado formalmente por la Máxima Autoridad?', 6],
    ['EGSI.4.1', 'EGSI FASE 4: CIERRE (MEJORA)', 'Cumplimiento', '¿Se remite anualmente el informe de estado de cumplimiento del EGSI y matriz de riesgos a la MINTEL en los plazos legales establecidos?', 9]
  ];

  let insertedCount = 0;
  for (const record of newRecords) {
    // Evitar duplicados si el script se corre 2 veces
    const check = db.prepare(`SELECT id FROM preguntas WHERE id_norma = ?`).get(record[0]);
    if (!check) {
      insertStmt.run(record[0], record[1], record[2], record[3], record[4]);
      insertedCount++;
    }
  }
  console.log(`✔️ Insertados ${insertedCount} nuevos controles gubernamentales.`);
  
  console.log("Migración completada con éxito.");

} catch (err) {
  console.error("❌ Error durante la migración:", err.message);
} finally {
  db.close();
}
