const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

db.transaction(() => {
    // 1. Update A.5.2.a
    db.prepare(`
        UPDATE preguntas 
        SET pregunta = '¿Se han definido y asignado los roles y responsabilidades de seguridad de la información según las necesidades de la organización?' 
        WHERE id_norma = 'A.5.2.a' AND (pregunta IS NULL OR trim(pregunta) = '')
    `).run();
    console.log("Updated A.5.2.a question text.");

    // 2. Update A.5.35.a
    db.prepare(`
        UPDATE preguntas 
        SET pregunta = '¿Cuenta la organización con procesos para realizar revisiones independientes?' 
        WHERE id_norma = 'A.5.35.a' AND (pregunta IS NULL OR trim(pregunta) = '')
    `).run();
    console.log("Updated A.5.35.a question text.");

    // 3. Delete A.5.1.d (garbage/empty item)
    const delResult = db.prepare(`
        DELETE FROM preguntas 
        WHERE id_norma = 'A.5.1.d' AND (pregunta IS NULL OR trim(pregunta) = '')
    `).run();
    console.log(`Deleted ${delResult.changes} garbage A.5.1.d rows.`);

    // 4. Insert parent for 9.1 if missing
    const parent91 = db.prepare(`SELECT id FROM preguntas WHERE id_norma = '9.1'`).get();
    if (!parent91) {
        db.prepare(`
            INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo)
            VALUES ('9.1', 'Cláusulas ISO 27001', 'Evaluación y Desempeño', '2022', 'Seguimiento, medición, análisis y evaluación', 1)
        `).run();
        console.log("Inserted parent row for 9.1.");
    }

    // 5. Insert parent for 9.2 if missing
    const parent92 = db.prepare(`SELECT id FROM preguntas WHERE id_norma = '9.2'`).get();
    if (!parent92) {
        db.prepare(`
            INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo)
            VALUES ('9.2', 'Cláusulas ISO 27001', 'Auditoría Interna', '2022', 'Auditoría interna', 1)
        `).run();
        console.log("Inserted parent row for 9.2.");
    }
})();

db.close();
console.log("Database fixes completed successfully!");
