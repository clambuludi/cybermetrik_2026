const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const user = reportsDb.prepare("SELECT * FROM users WHERE email = ?").get("evaluacion@gmail.com");
const report = reportsDb.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC").get(user.id);

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));

const parsedData = JSON.parse(report.data);
const parsedParcial = report.progresoParcialDecimal ? JSON.parse(report.progresoParcialDecimal) : {};

function translateRecord(record) {
    if (!record || typeof record !== 'object') return {};
    const newRecord = {};
    for (const key of Object.keys(record)) {
        newRecord[mapping[key] || key] = record[key];
    }
    return newRecord;
}

const progress = {
    completed: translateRecord(parsedData.checkedItems || parsedData),
    ignored: translateRecord(parsedData.ignoredItems || {}),
    evidenceLinks: translateRecord(parsedData.evidenceLinks || {}),
    progresoParcialDecimal: translateRecord(parsedParcial)
};

const rows = cmDb.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE id_norma LIKE 'A.5.7%'").all();

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

console.log("=== SUB-ITEMS OF A.5.7 ===");
rows.forEach(r => {
    const slug = generateId(r.pregunta);
    const completedVal = progress.completed[slug];
    const partialVal = progress.progresoParcialDecimal[slug];
    const link = progress.evidenceLinks[slug];
    
    // Calculate score
    const numericVal = typeof completedVal === 'boolean' 
        ? (completedVal ? 1.0 : 0.0) 
        : (completedVal ?? 0.0);
    
    const pValue = partialVal !== undefined && partialVal !== null
        ? Number(partialVal)
        : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
        
    const hasLink = typeof link === 'string' && link.trim() !== '';
    
    let score = 0;
    let description = '';
    if (numericVal === 1.0) {
        score = hasLink ? 1.0 : 0.4;
        description = hasLink ? '1.0 (Completado con link)' : '0.4 (Completado sin link)';
    } else if (numericVal === 0.5) {
        score = hasLink ? pValue : pValue * 0.4;
        description = hasLink ? `${pValue} (Parcial con link)` : `${pValue * 0.4} (Parcial sin link)`;
    } else {
        score = 0.0;
        description = '0.0 (Sin iniciar)';
    }
    
    console.log(`Norma: ${r.id_norma}`);
    console.log(` - Pregunta: ${r.pregunta}`);
    console.log(` - Slug: ${slug}`);
    console.log(` - Completed Value: ${completedVal}`);
    console.log(` - Partial Value: ${partialVal}`);
    console.log(` - Link: "${link || ''}" (hasLink = ${hasLink})`);
    console.log(` - Score calculated: ${score} (${description})`);
    console.log('----------------------------------------------------');
});

cmDb.close();
reportsDb.close();
