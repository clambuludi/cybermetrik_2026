const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT * FROM preguntas WHERE activo = 1").all();
console.log(`Loaded ${rows.length} active questions.`);

const targetPoints = 0.49;
const epsilon = 0.0001;

// We want to find a single question or a pair of questions where:
// finalScore * peso = targetPoints
// finalScore can be:
// - pValue if hasLink = true
// - pValue * 0.4 if hasLink = false
// pValue can be 1.0 (for Cumple) or anything between 0.1 and 0.9 (for Parcial) or 0.5 (for Parcial default).

const possiblePValues = [1.0, 0.5];
for (let p = 10; p <= 90; p += 10) {
    possiblePValues.push(p / 100);
}

const results = [];

rows.forEach(q => {
    const idEgsi = Number(q.id_dominio_egsi);
    if (idEgsi >= 6 && idEgsi <= 9) {
        const peso = Number(q.peso_gpr) || 0;
        possiblePValues.forEach(pValue => {
            [true, false].forEach(hasLink => {
                const numericVal = pValue === 1.0 ? 1.0 : 0.5;
                const finalScore = hasLink ? pValue : pValue * 0.4;
                const points = finalScore * peso;
                if (Math.abs(points - targetPoints) < epsilon) {
                    results.push({
                        type: 'single',
                        pregunta: q.pregunta,
                        id: q.id,
                        norma: q.id_norma,
                        peso,
                        idEgsi,
                        pValue,
                        hasLink,
                        points
                    });
                }
            });
        });
    }
});

console.log("Matching single question combinations:");
console.log(results);
