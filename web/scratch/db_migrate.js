const Database = require('better-sqlite3');
const db = new Database('reports.db');

try {
    // 1. Alter table to add the column if it doesn't exist
    db.prepare("ALTER TABLE reports ADD COLUMN progreso_parcial_decimal TEXT").run();
    console.log("Column 'progreso_parcial_decimal' added successfully.");
} catch (e) {
    if (e.message.includes("duplicate column name")) {
        console.log("Column 'progreso_parcial_decimal' already exists.");
    } else {
        console.error("Error adding column:", e);
    }
}

// 2. Populate default values for all existing reports
const allReports = db.prepare("SELECT id, data, progreso_parcial_decimal FROM reports").all();
console.log(`Processing ${allReports.length} reports...`);

const updateStmt = db.prepare("UPDATE reports SET progreso_parcial_decimal = ? WHERE id = ?");

for (const report of allReports) {
    let progresoMap = {};
    
    // If it's already populated, skip or update?
    // Let's populate it based on the checkedItems in the 'data' JSON string.
    try {
        const parsed = JSON.parse(report.data);
        const checked = parsed.checkedItems || parsed || {};
        
        for (const [itemId, val] of Object.entries(checked)) {
            // Normalize value
            const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (Number(val) || 0.0);
            
            if (numericVal === 1.0) {
                progresoMap[itemId] = 1.0;
            } else if (numericVal === 0.5) {
                progresoMap[itemId] = 0.5;
            } else {
                progresoMap[itemId] = 0.0;
            }
        }
        
        updateStmt.run(JSON.stringify(progresoMap), report.id);
        console.log(`Updated report ID ${report.id} successfully.`);
    } catch (err) {
        console.error(`Error updating report ID ${report.id}:`, err);
    }
}

console.log("Migration complete.");
db.close();
