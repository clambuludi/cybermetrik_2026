const Database = require('better-sqlite3');
const path = require('path');

const cmDbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const reportsDbPath = path.resolve(__dirname, '../reports.db');

const cmDb = new Database(cmDbPath, { readonly: true });
const reportsDb = new Database(reportsDbPath, { readonly: true });

// Load active questions
const rows = cmDb.prepare("SELECT id, id_norma, dominio, pregunta, peso_gpr FROM preguntas WHERE activo = 1").all();
cmDb.close();

// Filter Annex A items
const annexARows = rows.filter(r => !r.id_norma.startsWith('EGSI') && !r.dominio.includes('Cláusulas'));

// Load report 208
const report = reportsDb.prepare("SELECT * FROM reports WHERE id = 208").get();
reportsDb.close();

const reportData = JSON.parse(report.data);
const progress = {
    completed: reportData.checkedItems || {},
    ignored: reportData.ignoredItems || {},
    evidenceLinks: reportData.evidenceLinks || {},
    progresoParcialDecimal: reportData.progresoParcialDecimal || {}
};

if (report.progreso_parcial_decimal) {
    const dbParcial = JSON.parse(report.progreso_parcial_decimal);
    progress.progresoParcialDecimal = { ...progress.progresoParcialDecimal, ...dbParcial };
}

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

let sumOfSubitems = 0;
let activeSubitemsCount = 0;
let naSubitemsCount = 0;

annexARows.forEach(item => {
    const itemId = generateId(item.pregunta);
    const isIgnored = progress.ignored[itemId] || false;
    
    if (isIgnored) {
        naSubitemsCount++;
    } else {
        const val = progress.completed[itemId];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        const partialVal = progress.progresoParcialDecimal?.[itemId];
        const pValue = partialVal !== undefined && partialVal !== null
          ? Number(partialVal)
          : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

        const hasDriveLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';

        let score = 0;
        if (numericVal === 1.0) {
            score = hasDriveLink ? 1.0 : 0.4;
        } else if (numericVal === 0.5) {
            score = hasDriveLink ? pValue : pValue * 0.4;
        } else {
            score = 0;
        }

        sumOfSubitems += score;
        activeSubitemsCount++;
    }
});

console.log("=== CALCULATING DIRECTLY BY SUB-ITEMS (QUESTIONS) ===");
console.log("Total Annex A Sub-items (Questions) in DB:", annexARows.length);
console.log("N/A Sub-items:", naSubitemsCount);
console.log("Active Sub-items (Denominator):", activeSubitemsCount);
console.log("Sum of Sub-items Scores (Numerator):", sumOfSubitems.toFixed(4));
console.log(`Compliance Score (Sum * 100 / Denominator): ${(sumOfSubitems * 100 / activeSubitemsCount).toFixed(2)}%`);
console.log("====================================================");
