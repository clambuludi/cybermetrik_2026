const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const csvPath = path.resolve(__dirname, '../../base_preguntas.csv');
const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');

const db = new Database(dbPath);

// Simple CSV parser that handles quotes
function parseCSV(content) {
    const lines = content.split('\n');
    const result = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV fields supporting double quotes
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
                id: parseInt(fields[0], 10),
                id_norma: fields[1],
                dominio: fields[2],
                tipo_control: fields[3],
                pregunta: fields[4]
            });
        }
    }
    return result;
}

const csvData = fs.readFileSync(csvPath, 'utf-8');
const csvRows = parseCSV(csvData);

const a5CSVRows = csvRows.filter(r => r.dominio === 'EJECUCION A5: Controles Organizacionales');
console.log(`Found ${a5CSVRows.length} rows for A5 in CSV.`);

// Let's get existing A5 rows in DB
const dbRows = db.prepare(`SELECT id, id_norma, pregunta FROM preguntas WHERE dominio = 'EJECUCION A5: Controles Organizacionales'`).all();
const dbNormas = new Set(dbRows.map(r => r.id_norma));

console.log(`Existing A5 rows in DB: ${dbRows.length}`);

// We will insert missing ones
let insertedCount = 0;
const insertStmt = db.prepare(`
    INSERT INTO preguntas (id, id_norma, dominio, tipo_control, version, pregunta, activo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

db.transaction(() => {
    for (const csvRow of a5CSVRows) {
        if (!dbNormas.has(csvRow.id_norma)) {
            // Check if the id is already taken
            const idExists = db.prepare(`SELECT id FROM preguntas WHERE id = ?`).get(csvRow.id);
            const finalId = idExists ? null : csvRow.id;
            
            if (finalId) {
                insertStmt.run(csvRow.id, csvRow.id_norma, csvRow.dominio, csvRow.tipo_control, '2022', csvRow.pregunta, 1);
            } else {
                // If ID is taken, let SQLite autoincrement it
                db.prepare(`
                    INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(csvRow.id_norma, csvRow.dominio, csvRow.tipo_control, '2022', csvRow.pregunta, 1);
            }
            insertedCount++;
            console.log(`Restored missing row: ${csvRow.id_norma} | ${csvRow.pregunta}`);
        }
    }
})();

console.log(`Successfully restored ${insertedCount} missing A5 parent/flat controls in DB.`);

db.close();
