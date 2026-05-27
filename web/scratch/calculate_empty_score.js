const Database = require('better-sqlite3');
const path = require('path');

const cmDbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const cmDb = new Database(cmDbPath);
const activeRows = cmDb.prepare("SELECT * FROM preguntas WHERE activo = 1").all();
cmDb.close();

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

// Simulate empty progress
const progress = {
    completed: {},
    progresoParcialDecimal: {},
    ignored: {},
    evidenceLinks: {},
    justifications: {}
};

// Calculate scores using the exact logic from progress.tsx / madurez.ts
let isoTotalScore = 0;
let isoValidItems = 0;

let egsiObtainedPoints = 0;
let egsiTotalWeight = 0;

activeRows.forEach(item => {
    const itemId = generateId(item.pregunta);
    const isIsoSection = !item.dominio || !item.dominio.includes('EGSI FASE');

    // Si el control está marcado como N/A, se excluye del cálculo
    if (progress.ignored[itemId]) return;

    const val = progress.completed[itemId];
    const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
    const hasLink = !!progress.evidenceLinks[itemId];

    const partialVal = progress.progresoParcialDecimal?.[itemId];
    const pValue = partialVal !== undefined && partialVal !== null
      ? Number(partialVal)
      : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

    // Lógica de candado de Drive
    let finalScore = 0.0;
    if (numericVal === 1.0 || numericVal === 0.5) {
        finalScore = hasLink ? pValue : pValue * 0.4;
    }

    // 1. Acumulado ISO (Cláusulas y Anexo A)
    if (isIsoSection) {
        isoTotalScore += finalScore;
        isoValidItems++;
    }

    // 2. Acumulado EGSI (Controles GPR 6 al 9)
    const idEgsi = Number(item.id_dominio_egsi);
    if (idEgsi >= 6 && idEgsi <= 9) {
        const peso = Number(item.peso_gpr) || 0;
        egsiObtainedPoints += finalScore * peso;
        egsiTotalWeight += peso;
    }
});

const isoScore = isoValidItems === 0 ? 0 : Number((isoTotalScore / isoValidItems * 100).toFixed(2));
const egsiScore = egsiTotalWeight === 0 ? 0 : Number((egsiObtainedPoints / egsiTotalWeight * 100).toFixed(2));

console.log('--- EMPTY SCORING SIMULATION ---');
console.log('isoScore:', isoScore);
console.log('egsiScore:', egsiScore);
console.log('egsiObtainedPoints:', egsiObtainedPoints);
console.log('egsiTotalWeight:', egsiTotalWeight);
