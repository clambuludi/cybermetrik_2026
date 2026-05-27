const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
console.log("Opening database at:", dbPath);
const db = new Database(dbPath);

try {
    db.transaction(() => {
        // 1. Re-map A.5 parent controls from Phase 3 (8) to Phase 2 (7)
        const updateA5 = db.prepare(`
            UPDATE preguntas 
            SET id_dominio_egsi = 7 
            WHERE id_norma LIKE 'A.5%' AND id_dominio_egsi = 8
        `).run();
        console.log(`Updated ${updateA5.changes} A.5 parent rows to id_dominio_egsi = 7.`);

        // 2. Map Clausula 9.a, 9.b, 9.c to Phase 3 (8) and set their GPR weights
        const cl9a = db.prepare("UPDATE preguntas SET id_dominio_egsi = 8, peso_gpr = 1.00 WHERE id_norma = 'Clausula 9.a'").run();
        const cl9b = db.prepare("UPDATE preguntas SET id_dominio_egsi = 8, peso_gpr = 2.00 WHERE id_norma = 'Clausula 9.b'").run();
        const cl9c = db.prepare("UPDATE preguntas SET id_dominio_egsi = 8, peso_gpr = 2.00 WHERE id_norma = 'Clausula 9.c'").run();
        console.log(`Mapped Clausula 9.a/b/c to Phase 8. Changes: ${cl9a.changes + cl9b.changes + cl9c.changes}`);

        // 3. Map Clausula 9.d, 9.e, 10.a, 10.b to Phase 4 (9) and set their GPR weights
        const cl9d = db.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 1.50 WHERE id_norma = 'Clausula 9.d'").run();
        const cl9e = db.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 1.50 WHERE id_norma = 'Clausula 9.e'").run();
        const cl10a = db.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 2.00 WHERE id_norma = 'Clausula 10.a'").run();
        const cl10b = db.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 2.00 WHERE id_norma = 'Clausula 10.b'").run();
        console.log(`Mapped Clausula 9.d/e & 10.a/b to Phase 9. Changes: ${cl9d.changes + cl9e.changes + cl10a.changes + cl10b.changes}`);

        // 4. Map parent Clausula 9 to Phase 8 and parent Clausula 10 to Phase 9
        const cl9Parent = db.prepare("UPDATE preguntas SET id_dominio_egsi = 8 WHERE id_norma = 'Clausula 9'").run();
        const cl10Parent = db.prepare("UPDATE preguntas SET id_dominio_egsi = 9 WHERE id_norma = 'Clausula 10'").run();
        console.log(`Mapped parent Clausula 9 & 10. Changes: ${cl9Parent.changes + cl10Parent.changes}`);

        console.log("Transaction successfully completed.");
    })();
} catch (err) {
    console.error("Error executing database updates:", err);
} finally {
    db.close();
    console.log("Database connection closed.");
}
