const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT * FROM preguntas WHERE activo = 1 AND id_dominio_egsi = 7").all();
console.log(`Total active Fase 2 questions: ${rows.length}`);

let nonZeroWeights = [];
let zeroWeightsCount = 0;
let totalWeight = 0;
rows.forEach(r => {
    const w = Number(r.peso_gpr);
    totalWeight += w;
    if (w !== 0) {
        nonZeroWeights.push({ id: r.id, norma: r.id_norma, peso: w });
    } else {
        zeroWeightsCount++;
    }
});

console.log(`Fase 2 total weight: ${totalWeight}`);
console.log(`Zero weight count: ${zeroWeightsCount}`);
console.log(`Non-zero weights:`, nonZeroWeights);
