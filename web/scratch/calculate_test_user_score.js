const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'reports.db');
const db = new Database(dbPath);

const row = db.prepare("SELECT * FROM reports WHERE id = 178").get();
const parsed = JSON.parse(row.data);
const checkedItems = parsed.checkedItems || parsed || {};
const evidenceLinks = parsed.evidenceLinks || {};
const ignoredItems = parsed.ignoredItems || {};
const progresoParcialDecimal = parsed.progresoParcialDecimal || {};

// Load active questions from cybermetrik.db
const cmDbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const cmDb = new Database(cmDbPath);
const activeRows = cmDb.prepare("SELECT * FROM preguntas WHERE activo = 1").all();
cmDb.close();

// Group like layout.tsx
const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

let egsiObtainedPoints = 0;
let egsiTotalWeight = 0;

activeRows.forEach(item => {
    const itemId = generateId(item.pregunta);
    const idEgsi = Number(item.id_dominio_egsi);
    if (idEgsi >= 6 && idEgsi <= 9) {
        const peso = Number(item.peso_gpr) || 0;
        
        const val = checkedItems[itemId];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        const hasLink = !!evidenceLinks[itemId];

        const partialVal = progresoParcialDecimal[itemId];
        const pValue = partialVal !== undefined && partialVal !== null
          ? Number(partialVal)
          : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

        let finalScore = 0.0;
        if (numericVal === 1.0 || numericVal === 0.5) {
            finalScore = hasLink ? pValue : pValue * 0.4;
        }

        egsiTotalWeight += peso;
        if (finalScore > 0) {
            console.log(`NON-ZERO: ${itemId} | val: ${val} | numericVal: ${numericVal} | finalScore: ${finalScore} | peso: ${peso} | contribution: ${finalScore * peso}`);
            egsiObtainedPoints += finalScore * peso;
        }
    }
});

const egsiScore = egsiTotalWeight === 0 ? 0 : Number((egsiObtainedPoints / egsiTotalWeight * 100).toFixed(2));
console.log('egsiTotalWeight:', egsiTotalWeight);
console.log('egsiObtainedPoints:', egsiObtainedPoints);
console.log('EGSI Score:', egsiScore);
db.close();
