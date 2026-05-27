const Database = require('better-sqlite3');
const path = require('path');

const rDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });
const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));

try {
    cmDb.transaction(() => {
        // --- 1. PERFORM PROPOSED UPDATES IN TRANSACTION ---

        // Re-map A.5 parent controls from Phase 3 (8) to Phase 2 (7)
        const updateA5 = cmDb.prepare(`
            UPDATE preguntas 
            SET id_dominio_egsi = 7 
            WHERE id_norma LIKE 'A.5%' AND id_dominio_egsi = 8
        `).run();
        console.log(`Updated ${updateA5.changes} A.5 parents to id_dominio_egsi = 7.`);

        // Re-map Clause 9.a, 9.b, 9.c to Phase 3 (8) and set their GPR weights
        const cl9a = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 8, peso_gpr = 1.00 WHERE id_norma = 'Clausula 9.a'").run();
        const cl9b = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 8, peso_gpr = 2.00 WHERE id_norma = 'Clausula 9.b'").run();
        const cl9c = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 8, peso_gpr = 2.00 WHERE id_norma = 'Clausula 9.c'").run();
        console.log(`Mapped Clausula 9.a/b/c to Phase 8 (weights: 1.0, 2.0, 2.0). Changes: ${cl9a.changes + cl9b.changes + cl9c.changes}`);

        // Re-map Clause 9.d, 9.e, 10.a, 10.b to Phase 4 (9) and set their GPR weights
        const cl9d = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 1.50 WHERE id_norma = 'Clausula 9.d'").run();
        const cl9e = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 1.50 WHERE id_norma = 'Clausula 9.e'").run();
        const cl10a = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 2.00 WHERE id_norma = 'Clausula 10.a'").run();
        const cl10b = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 9, peso_gpr = 2.00 WHERE id_norma = 'Clausula 10.b'").run();
        console.log(`Mapped Clausula 9.d/e & 10.a/b to Phase 9 (weights: 1.5, 1.5, 2.0, 2.0). Changes: ${cl9d.changes + cl9e.changes + cl10a.changes + cl10b.changes}`);

        // Set parent Clause 9 to Phase 8 and parent Clause 10 to Phase 9, if needed?
        // Wait, let's see what happens to the parent items "Clausula 9" and "Clausula 10"
        const cl9Parent = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 8 WHERE id_norma = 'Clausula 9'").run();
        const cl10Parent = cmDb.prepare("UPDATE preguntas SET id_dominio_egsi = 9 WHERE id_norma = 'Clausula 10'").run();
        console.log(`Mapped parent Clausula 9 & 10. Changes: ${cl9Parent.changes + cl10Parent.changes}`);

        // --- 2. RUN SCORE SIMULATION ---

        const reports = rDb.prepare("SELECT * FROM reports").all();
        const allItems = cmDb.prepare("SELECT id, id_norma, pregunta, id_dominio_egsi, peso_gpr, dominio, activo FROM preguntas WHERE activo = 1").all();

        const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

        const calculateScore = (items, isEgsi, completed, evidenceLinks, ignored, progresoParcialDecimal) => {
            let totalScore = 0;
            let validItems = 0;
            let obtainedGPRPoints = 0;
            let totalGPRWeight = 0;

            const isFase2 = items.length > 0 && Number(items[0].id_dominio_egsi) === 7;

            items.forEach(item => {
                const id = generateId(item.pregunta);
                if (ignored[id] && !isFase2) return;
                validItems++;

                const val = completed[id];
                const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
                const hasLink = !!evidenceLinks[id];

                const partialVal = progresoParcialDecimal[id];
                const pValue = partialVal !== undefined && partialVal !== null
                  ? Number(partialVal)
                  : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

                let finalScore = 0.0;
                if (numericVal === 1.0 || numericVal === 0.5) {
                    finalScore = hasLink ? pValue : pValue * 0.4;
                }

                if (isEgsi && !isFase2) {
                    const peso = Number(item.peso_gpr) || 0;
                    obtainedGPRPoints += finalScore * peso;
                    totalGPRWeight += peso;
                } else {
                    totalScore += finalScore;
                }
            });

            if (isFase2) {
                // Wait! Let's check how many active items are now in Fase 2
                // We'll dynamic-count them or keep the original 93 denominator?
                // Let's print both.
                return Math.round((totalScore / 93) * 100);
            }

            if (isEgsi) {
                if (totalGPRWeight === 0) return 0;
                return Math.round((obtainedGPRPoints / totalGPRWeight) * 100);
            } else {
                if (validItems === 0) return 0;
                return Math.round((totalScore / validItems) * 100);
            }
        };

        const egsiGroups = [
            { id: 6, title: 'EGSI FASE 1: PLANIFICACIÓN' },
            { id: 7, title: 'EGSI FASE 2: EJECUCIÓN' },
            { id: 8, title: 'EGSI FASE 3: CONTROL (EVALUACIÓN)' },
            { id: 9, title: 'EGSI FASE 4: CIERRE (MEJORA)' }
        ];

        reports.forEach(report => {
            const parsed = JSON.parse(report.data);
            const completed = parsed.checkedItems || parsed || {};
            const evidenceLinks = parsed.evidenceLinks || {};
            const ignored = parsed.ignoredItems || {};
            const progresoParcialDecimal = parsed.progresoParcialDecimal || {};

            console.log(`\nResults for report ID: ${report.id} (user: ${report.user_name})`);
            egsiGroups.forEach(g => {
                const items = allItems.filter(i => i.id_dominio_egsi === g.id);
                const score = calculateScore(items, true, completed, evidenceLinks, ignored, progresoParcialDecimal);
                console.log(`  Domain: ${g.title} | Score: ${score}% | Count: ${items.length}`);
            });
        });

        // FORCE ROLLBACK
        throw new Error("ROLLBACK_ON_PURPOSE");
    })();
} catch (e) {
    if (e.message === "ROLLBACK_ON_PURPOSE") {
        console.log("\nSuccess: Simulated changes rolled back successfully.");
    } else {
        console.error("Error during transaction:", e);
    }
}

rDb.close();
cmDb.close();
