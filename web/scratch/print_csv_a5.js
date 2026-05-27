const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../../base_preguntas.csv');
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
    if (fields.length >= 2 && fields[1].startsWith('A.5')) {
        console.log(`${fields[1]} | ${fields[4]}`);
    }
}
