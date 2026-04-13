import Database from 'better-sqlite3';

const db = new Database('reports.db');

// Create reports table if it doesn't exist
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            user_name TEXT NOT NULL,
            score INTEGER NOT NULL,
            completed_count INTEGER NOT NULL,
            total_count INTEGER NOT NULL,
            data TEXT NOT NULL
        );
    `);
    console.log('✅ Table created or already exists');
} catch (error) {
    console.error('❌ Failed to create table:', error);
    process.exit(1);
}

// Check if user_name column exists, if not in old schema, add it
try {
    const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
    const hasUserName = tableInfo.some(col => col.name === 'user_name');

    if (!hasUserName) {
        db.exec(`
            ALTER TABLE reports ADD COLUMN user_name TEXT NOT NULL DEFAULT 'Usuario Anónimo';
        `);
        console.log('✅ Migration successful: Added user_name column to reports table');
    } else {
        console.log('ℹ️  Column user_name already exists, skipping migration');
    }
} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}

db.close();
console.log('✅ Database migration completed successfully');
