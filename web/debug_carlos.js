const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'reports.db');
const db = new Database(dbPath);

try {
    const carlos = db.prepare("SELECT id, name FROM users WHERE name = 'Carlos Ambuludi'").get();

    if (!carlos) {
        console.log("No se encontró al usuario 'Carlos Ambuludi'.");
    } else {
        const reports = db.prepare("SELECT score, created_at FROM reports WHERE user_id = ? ORDER BY created_at ASC").all(carlos.id);

        console.log("--- RESULTADOS REALES DE CARLOS AMBULUDI ---");
        console.log("Cantidad total de evaluaciones:", reports.length);

        let sum = 0;
        reports.forEach((r, i) => {
            console.log(`Evaluación ${i + 1}: ${r.score}% (${r.created_at})`);
            sum += r.score;
        });

        const avg = sum / reports.length;
        console.log("-------------------------------------------");
        console.log("Suma de todos los puntajes:", sum);
        console.log("Cálculo exacto: " + sum + " / " + reports.length + " = " + avg.toFixed(2) + "%");
    }
} catch (err) {
    console.error("Error:", err.message);
} finally {
    db.close();
}
