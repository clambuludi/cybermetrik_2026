const Database = require('better-sqlite3');
const path = require('path');

const rDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });
const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const report = rDb.prepare("SELECT * FROM reports WHERE id = 195").get();
const parsed = JSON.parse(report.data);
const completed = parsed.checkedItems || parsed || {};
const evidenceLinks = parsed.evidenceLinks || {};
const ignored = parsed.ignoredItems || {};
const progresoParcialDecimal = parsed.progresoParcialDecimal || {};

const items = cmDb.prepare("SELECT id, id_norma, pregunta, id_dominio_egsi, peso_gpr, dominio, activo FROM preguntas WHERE id_dominio_egsi = 8 AND activo = 1").all();

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

console.log("Analyzing Fase 3 items for Report 195:");
let obtainedGPRPoints = 0;
let totalGPRWeight = 0;

items.forEach(item => {
    const id = generateId(item.pregunta);
    const val = completed[id];
    const isIgnored = !!ignored[id];
    
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

    const peso = Number(item.peso_gpr) || 0;
    
    if (isIgnored) {
        console.log(`IGNORED: ${item.id_norma} | Weight: ${peso}`);
    } else {
        totalGPRWeight += peso;
        obtainedGPRPoints += finalScore * peso;
        if (finalScore > 0 || peso > 0) {
            console.log(`Item: ${item.id_norma} | Weight: ${peso} | val: ${val} | finalScore: ${finalScore} | ID: ${id}`);
        }
    }
});

console.log("obtainedGPRPoints:", obtainedGPRPoints);
console.log("totalGPRWeight:", totalGPRWeight);
const score = totalGPRWeight === 0 ? 0 : Math.round((obtainedGPRPoints / totalGPRWeight) * 100);
console.log("Calculated Score:", score);

rDb.close();
cmDb.close();
