const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../../base_preguntas.csv');
if (!fs.existsSync(csvPath)) {
    console.log("CSV does not exist");
    process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

const counts = {};

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
    if (fields.length >= 2) {
        const id_norma = fields[1];
        let prefix = 'Other';
        if (id_norma.startsWith('A.5')) prefix = 'A.5';
        else if (id_norma.startsWith('A.6')) prefix = 'A.6';
        else if (id_norma.startsWith('A.7')) prefix = 'A.7';
        else if (id_norma.startsWith('A.8')) prefix = 'A.8';
        else if (id_norma.match(/^\d/) || id_norma.startsWith('Clausula')) prefix = 'Clauses';
        
        counts[prefix] = (counts[prefix] || 0) + 1;
    }
}

console.log("CSV Counts:", counts);
