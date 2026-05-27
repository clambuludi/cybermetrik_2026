const Database = require('better-sqlite3');
const path = require('path');

const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const rows = reportsDb.prepare("SELECT id, user_id, user_name, progreso_parcial_decimal FROM reports").all();

console.log("=== REPORTS WITH NON-EMPTY PARTIAL PROGRESS ===");
let count = 0;
rows.forEach(r => {
    const p = r.progreso_parcial_decimal ? JSON.parse(r.progreso_parcial_decimal) : {};
    const keys = Object.keys(p);
    if (keys.length > 0) {
        count++;
        console.log(`Report ID: ${r.id} | User: ${r.user_name} (ID: ${r.user_id}) | Keys count: ${keys.length}`);
        console.log("Keys and values:", p);
    }
});

if (count === 0) {
    console.log("No reports have a non-empty progreso_parcial_decimal in the database!");
}

reportsDb.close();
