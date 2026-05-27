const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbFiles = [
    'c:/Users/CSC/Documents/CyberMetrik/reports.db',
    'c:/Users/CSC/Documents/CyberMetrik/web/reports.db',
    'c:/Users/CSC/Documents/CyberMetrik/instance/cybermetrik.db'
];

dbFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`File does not exist: ${file}`);
        return;
    }
    try {
        const db = new Database(file, { readonly: true });
        // Check if table users exists
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
        if (tableCheck) {
            const user = db.prepare("SELECT * FROM users WHERE email = ?").get('prueba@gmail.com');
            console.log(`File: ${file} (has 'users' table). User search result:`, user);
        } else {
            console.log(`File: ${file} (does NOT have 'users' table)`);
        }
        db.close();
    } catch (err) {
        console.log(`Error reading ${file}:`, err.message);
    }
});
