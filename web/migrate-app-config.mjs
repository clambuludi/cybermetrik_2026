import Database from 'better-sqlite3';

const db = new Database('reports.db');

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
