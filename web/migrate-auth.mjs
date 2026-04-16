import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('reports.db');

// Create users table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'client'
    );
`);
console.log('✅ users table ready');

// Add userId to reports if missing
const cols = db.prepare("PRAGMA table_info(reports)").all();
const hasUserId = cols.some(c => c.name === 'user_id');
if (!hasUserId) {
    db.exec(`ALTER TABLE reports ADD COLUMN user_id INTEGER REFERENCES users(id);`);
    console.log('✅ user_id column added to reports');
} else {
    console.log('ℹ️  user_id already exists in reports');
}

// Create default admin if none exists
const ADMIN_EMAIL = 'admin@cybermetrik.com';
const ADMIN_PASSWORD = 'Admin1234!';
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
if (!existing) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
        .run('Administrador', ADMIN_EMAIL, hash);
    console.log(`✅ Admin creado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log('⚠️  Cambia la contraseña del admin luego del primer login!');
} else {
    console.log('ℹ️  Admin ya existe');
}

db.close();
console.log('✅ Migración completada');
