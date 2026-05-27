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

// 2. Build a catalog of all possible old questions from various source files
const oldCatalog = {}; // slug -> id_norma

// 2A. Parse base_preguntas.csv
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
            const id_norma = fields[1];
            const pregunta = fields[4];
            const slug = generateId(pregunta);
            oldCatalog[slug] = id_norma;
        }
    }
}

// Helper to parse the JS rawData variables in update scripts
function parseUpdateScript(filename, idPrefix) {
    const filePath = path.resolve(__dirname, '../../web', filename);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find the rawData string
    const match = content.match(/const rawData = `([\s\S]+?)`;/);
    if (!match) return;
    
    const lines = match[1].split('\n').filter(l => l.trim() !== '');
    lines.forEach(line => {
        const partsMatch = line.trim().match(/^([^\s]+)\s+(.*)$/);
        if (!partsMatch) return;
        
        let id = partsMatch[1].trim();
        let text = partsMatch[2].trim();
        if (text.startsWith('"')) text = text.substring(1);
        if (text.endsWith('"')) text = text.substring(0, text.length - 1);
        text = text.trim();
        
        // Translate the ID to standard A.x.y format if needed
        let standardId = id;
        if (idPrefix === 'A.5' && id.match(/^\d/)) {
            // e.g. 5.1a -> A.5.1.a, 5.2 -> A.5.2
            const parts = id.match(/^5\.(\d+)([a-z])?$/);
            if (parts) {
                standardId = `A.5.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
            }
        } else if (idPrefix === 'A.6' && id.match(/^\d/)) {
            // e.g. 6.1a -> A.6.1.a, 6.2 -> A.6.2
            const parts = id.match(/^6\.(\d+)([a-z])?$/);
            if (parts) {
                standardId = `A.6.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
            }
        } else if (idPrefix === 'A.7' && id.match(/^\d/)) {
            const parts = id.match(/^7\.(\d+)([a-z])?$/);
            if (parts) {
                standardId = `A.7.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
            }
        } else if (idPrefix === 'A.8' && id.match(/^\d/)) {
            const parts = id.match(/^8\.(\d+)([a-z])?$/);
            if (parts) {
                standardId = `A.8.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
            }
        }
        
        const slug = generateId(text);
        oldCatalog[slug] = standardId;
    });
}

parseUpdateScript('update_dominio5.js', 'A.5');
parseUpdateScript('update_dominio6.js', 'A.6');
parseUpdateScript('update_dominio7.js', 'A.7');
parseUpdateScript('update_dominio8.js', 'A.8');

// Add EGSI phase 1 from migrate_egsi.js
const migrateEgsiPath = path.resolve(__dirname, '../../web/migrate_egsi.js');
if (fs.existsSync(migrateEgsiPath)) {
    const content = fs.readFileSync(migrateEgsiPath, 'utf-8');
    const matches = content.matchAll(/\['(EGSI\.\d+\.\d+)', '[^']+', '[^']+', '([^']+)'/g);
    for (const m of matches) {
        const id_norma = m[1];
        const text = m[2];
        const slug = generateId(text);
        oldCatalog[slug] = id_norma;
    }
}

// Add Cláusulas from fix_clausulas.js / insertar_clausulas.js
const fixClausulasPath = path.resolve(__dirname, '../../web/fix_clausulas.js');
if (fs.existsSync(fixClausulasPath)) {
    const content = fs.readFileSync(fixClausulasPath, 'utf-8');
    const matches = content.matchAll(/id:\s*"([^"]+)",\s*componente:\s*"[^"]+",\s*pregunta:\s*"([^"]+)"/g);
    for (const m of matches) {
        const id_norma = m[1];
        const text = m[2];
        const slug = generateId(text);
        oldCatalog[slug] = id_norma;
    }
}

console.log(`Old catalog populated with ${Object.keys(oldCatalog).length} keys.`);

// 3. Map user report slugs to standard id_norma
const finalMap = {};
const unmapped = [];

oldSlugs.forEach(slug => {
    if (oldCatalog[slug]) {
        finalMap[slug] = oldCatalog[slug];
    } else {
        // Manual override or fallback
        unmapped.push(slug);
    }
});

console.log(`Successfully mapped: ${Object.keys(finalMap).length} / ${oldSlugs.length}`);
console.log(`Unmapped: ${unmapped.length}`);
if (unmapped.length > 0) {
    console.log("Unmapped old slugs:", unmapped);
}

console.log("\nSample map entries (first 10):");
console.log(Object.entries(finalMap).slice(0, 10));
