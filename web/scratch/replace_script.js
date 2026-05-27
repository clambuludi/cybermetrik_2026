const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'psc', 'maturity-trend.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace sortedReports with chronologicalReports
content = content.replace(/sortedReports/g, 'chronologicalReports');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully replaced sortedReports with chronologicalReports in maturity-trend.tsx');
