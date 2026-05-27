const Database = require('better-sqlite3');
const path = require('path');

const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const report = reportsDb.prepare("SELECT id, progreso_parcial_decimal, data FROM reports WHERE id = 208").get();

console.log("=== RAW REPORT 208 ===");
console.log("ID:", report.id);
console.log("progreso_parcial_decimal:", report.progreso_parcial_decimal);
console.log("data length:", report.data.length);

// Let's parse data and look for any key that contains "A.5.7" or "inteligencia"
const data = JSON.parse(report.data);
console.log("Checking data object keys...");
const keys = Object.keys(data);
console.log("Total keys in data:", keys.length);

const matchedKeys = keys.filter(k => k.includes("amenazas") || k.includes("inteligencia") || k.includes("comparte"));
console.log("Matched keys in data:", matchedKeys);
matchedKeys.forEach(k => {
    console.log(` - ${k}: ${data[k]}`);
});

// Let's print checkedItems if it exists
if (data.checkedItems) {
    const checkedKeys = Object.keys(data.checkedItems);
    console.log("Total keys in checkedItems:", checkedKeys.length);
    const matchedChecked = checkedKeys.filter(k => k.includes("amenazas") || k.includes("inteligencia") || k.includes("comparte"));
    console.log("Matched keys in checkedItems:", matchedChecked);
    matchedChecked.forEach(k => {
        console.log(` - ${k}: ${data.checkedItems[k]}`);
    });
}

// Let's print evidenceLinks if it exists
if (data.evidenceLinks) {
    console.log("evidenceLinks:", data.evidenceLinks);
}

// Let's print progresoParcialDecimal if it exists inside data
if (data.progresoParcialDecimal) {
    console.log("progresoParcialDecimal inside data:", data.progresoParcialDecimal);
}

reportsDb.close();
