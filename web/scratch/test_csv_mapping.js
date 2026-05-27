const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const csvPath = path.resolve(__dirname, '../../base_preguntas.csv');
const rDbPath = path.resolve(__dirname, '../../web/reports.db');

// Simple CSV parser
function parseCSV(content) {
    const lines = content.split('\n');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const fields = [];
        let currentField = '';
        let insideQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                fields.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField.trim());
        if (fields.length >= 5) {
            result.push({
                id: fields[0],
                id_norma: fields[1],
                dominio: fields[2],
                tipo_control: fields[3],
                pregunta: fields[4]
            });
        }
    }
    return result;
}

const csvRows = parseCSV(fs.readFileSync(csvPath, 'utf-8'));
const rDb = new Database(rDbPath, { readonly: true });
const report = rDb.prepare("SELECT * FROM reports WHERE id = 202").get();
rDb.close();

const parsed = JSON.parse(report.data);
const checked = parsed.checkedItems || parsed;
const oldSlugs = Object.keys(checked);

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const csvMap = {};
csvRows.forEach(row => {
    const slug = generateId(row.pregunta);
    csvMap[slug] = row.id_norma;
});

console.log(`Loaded ${csvRows.length} rows from CSV.`);
console.log(`Found ${oldSlugs.length} slugs in Report 202.`);

let matched = 0;
let unmatched = [];

oldSlugs.forEach(slug => {
    if (csvMap[slug]) {
        matched++;
    } else {
        unmatched.push(slug);
    }
});

console.log(`Matched old report slugs to CSV: ${matched}`);
console.log(`Unmatched old report slugs: ${unmatched.length}`);
if (unmatched.length > 0) {
    console.log("Unmatched list:");
    console.log(unmatched);
}
