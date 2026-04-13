import Database from 'better-sqlite3';

const db = new Database('reports.db');

console.log('🚀 Starting evaluation lifecycle migration...');

try {
    // 1. Clear existing reports to "start from zero" as requested
    console.log('🧹 Clearing existing reports history...');
    db.exec(`DELETE FROM reports;`);
    console.log('✅ History cleared.');

    // 2. Add new columns
    const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
    const hasFinalized = tableInfo.some(col => col.name === 'is_finalized');
    const hasEvalNum = tableInfo.some(col => col.name === 'evaluation_number');

    if (!hasFinalized) {
        db.exec(`ALTER TABLE reports ADD COLUMN is_finalized INTEGER NOT NULL DEFAULT 0;`);
        console.log('✅ Added is_finalized column.');
    }

    if (!hasEvalNum) {
        db.exec(`ALTER TABLE reports ADD COLUMN evaluation_number INTEGER NOT NULL DEFAULT 1;`);
        console.log('✅ Added evaluation_number column.');
    }

} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}

db.close();
console.log('✨ Migration completed successfully. Count restarted from zero.');
