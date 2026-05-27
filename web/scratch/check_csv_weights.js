const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '..', '..', 'base_preguntas_actualizada.csv');
const content = fs.readFileSync(csvPath, 'utf8');

const lines = content.split('\n');
console.log('Total CSV lines:', lines.length);

// Find any line with fractional weights
lines.forEach((line, idx) => {
    if (line.includes('0.')) {
        console.log(`Line ${idx + 1}: ${line}`);
    }
});
