const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const generateId = (title) => {
    return title.toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]/g, '');
};

// 1. Get old slugs from report 202
const rDbPath = path.resolve(__dirname, '../../web/reports.db');
const rDb = new Database(rDbPath, { readonly: true });
const report = rDb.prepare("SELECT * FROM reports WHERE id = 202").get();
rDb.close();
const parsed = JSON.parse(report.data);
const checked = parsed.checkedItems || parsed;
const oldSlugs = Object.keys(checked);

// 2. Build old catalog slug -> standard id_norma
const oldCatalog = {};

const csvPath = path.resolve(__dirname, '../../base_preguntas.csv');
if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const fields = [];
        let currentField = '';
        let insideQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') insideQuotes = !insideQuotes;
            else if (char === ',' && !insideQuotes) {
                fields.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField.trim());
        if (fields.length >= 5) {
            oldCatalog[generateId(fields[4])] = fields[1];
        }
    }
}

// Helper to parse JS rawData
function parseToCatalog(filename, idPrefix) {
    const filePath = path.resolve(__dirname, '../../web', filename);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/const rawData = `([\s\S]+?)`;/);
    if (!match) return;
    match[1].split('\n').filter(l => l.trim() !== '').forEach(line => {
        const partsMatch = line.trim().match(/^([^\s]+)\s+(.*)$/);
        if (!partsMatch) return;
        let id = partsMatch[1].trim();
        let text = partsMatch[2].trim();
        if (text.startsWith('"')) text = text.substring(1);
        if (text.endsWith('"')) text = text.substring(0, text.length - 1);
        text = text.trim();
        
        let standardId = id;
        if (idPrefix === 'A.5' && id.match(/^\d/)) {
            const parts = id.match(/^5\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.5.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        } else if (idPrefix === 'A.6' && id.match(/^\d/)) {
            const parts = id.match(/^6\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.6.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        } else if (idPrefix === 'A.7' && id.match(/^\d/)) {
            const parts = id.match(/^7\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.7.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        } else if (idPrefix === 'A.8' && id.match(/^\d/)) {
            const parts = id.match(/^8\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.8.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        }
        
        oldCatalog[generateId(text)] = standardId;
    });
}
parseToCatalog('update_dominio5.js', 'A.5');
parseToCatalog('update_dominio6.js', 'A.6');
parseToCatalog('update_dominio7.js', 'A.7');
parseToCatalog('update_dominio8.js', 'A.8');

// 3. Load current active questions from cybermetrik.db
const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'), { readonly: true });
const currentQuestions = cmDb.prepare("SELECT id_norma, pregunta FROM preguntas WHERE activo = 1").all();
cmDb.close();

const activeSlugsMap = {};
currentQuestions.forEach(q => {
    activeSlugsMap[generateId(q.pregunta)] = q.id_norma;
});

// Load the mapping file
const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf-8'));

console.log("Analyzing mismatches/shifts between old catalog and current database mapping:");
oldSlugs.forEach(slug => {
    const oldNorma = oldCatalog[slug];
    const newSlug = mapping[slug];
    const newNorma = activeSlugsMap[newSlug];
    
    if (oldNorma && newNorma && oldNorma !== newNorma) {
        console.log(`SHIFT: "${slug}"\n -> Old Norma: ${oldNorma}\n -> Mapped to: ${newNorma} ("${newSlug}")`);
    }
});
console.log("Done.");
