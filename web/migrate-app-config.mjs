import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Resolve reports.db path dynamically
let dbPath = path.resolve(process.cwd(), 'reports.db');
if (!fs.existsSync(dbPath)) {
    const webPath = path.resolve(process.cwd(), 'web/reports.db');
    if (fs.existsSync(webPath)) {
        dbPath = webPath;
    } else if (process.platform !== 'win32') {
        dbPath = '/var/www/cybermetrik/web/reports.db';
    }
}

const db = new Database(dbPath);

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);
    console.log('✅ Table app_config created or already exists');
} catch (error) {
    console.error('❌ Failed to create table:', error);
    process.exit(1);
}

db.close();
console.log('✅ App config migration completed successfully');
