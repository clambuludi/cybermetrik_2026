const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'reports.db');
const db = new Database(dbPath);

const cmDbPath = path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db');
const cmDb = new Database(cmDbPath);
const activeRows = cmDb.prepare("SELECT * FROM preguntas WHERE activo = 1").all();
cmDb.close();

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const reports = db.prepare("SELECT id, user_name, data, progreso_parcial_decimal FROM reports").all();

reports.forEach(report => {
    let checkedItems = {};
    let evidenceLinks = {};
    let ignoredItems = {};
    let progresoParcialDecimal = {};

    try {
        const parsed = JSON.parse(report.data);
        checkedItems = parsed.checkedItems || parsed || {};
        evidenceLinks = parsed.evidenceLinks || {};
        ignoredItems = parsed.ignoredItems || {};
        progresoParcialDecimal = parsed.progresoParcialDecimal || {};
        
        if (report.progreso_parcial_decimal) {
            progresoParcialDecimal = { ...progresoParcialDecimal, ...JSON.parse(report.progreso_parcial_decimal) };
        }
    } catch (e) {
        // console.error(e);
    }

    let egsiObtainedPoints = 0;
    let egsiTotalWeight = 0;
    const nonZeroItems = [];

    activeRows.forEach(item => {
        const itemId = generateId(item.pregunta);
        const idEgsi = Number(item.id_dominio_egsi);
        if (idEgsi >= 6 && idEgsi <= 9) {
            const peso = Number(item.peso_gpr) || 0;
            
            const isIgnored = !!ignoredItems[itemId];
            if (isIgnored) return; // Excluded

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
                nonZeroItems.push({ itemId, val, finalScore, peso, contribution: finalScore * peso });
                egsiObtainedPoints += finalScore * peso;
            }
        }
    });

    const egsiScore = egsiTotalWeight === 0 ? 0 : Number((egsiObtainedPoints / egsiTotalWeight * 100).toFixed(2));
    if (egsiScore > 0 && egsiScore < 5) {
        console.log(`Report ID: ${report.id} | User: ${report.user_name} | EGSI Score: ${egsiScore}%`);
        console.log('Non-zero items:', nonZeroItems);
        console.log('Total weight:', egsiTotalWeight, 'Obtained points:', egsiObtainedPoints);
        console.log('----------------------------------------------------');
    }
});

db.close();
