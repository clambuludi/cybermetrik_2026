const Database = require('better-sqlite3');
const path = require('path');

const rDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });
const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

// Get all reports
const reports = rDb.prepare("SELECT * FROM reports").all();
if (reports.length === 0) {
    console.log("No reports found.");
    process.exit(0);
}

reports.forEach(report => {
    console.log(`\nAnalyzing report ID: ${report.id} for user: ${report.user_name}`);


const parsed = JSON.parse(report.data);
const completed = parsed.checkedItems || parsed || {};
const evidenceLinks = parsed.evidenceLinks || {};
const ignored = parsed.ignoredItems || {};
const progresoParcialDecimal = parsed.progresoParcialDecimal || {};

const allItems = cmDb.prepare("SELECT id, id_norma, pregunta, id_dominio_egsi, peso_gpr, dominio, activo FROM preguntas WHERE activo = 1").all();

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const calculateScore = (items, isEgsi) => {
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

egsiGroups.forEach(g => {
    const items = allItems.filter(i => i.id_dominio_egsi === g.id);
    const score = calculateScore(items, true);
    console.log(`Domain: ${g.title} | Score: ${score}% | Count: ${items.length}`);
});

});

rDb.close();
cmDb.close();
