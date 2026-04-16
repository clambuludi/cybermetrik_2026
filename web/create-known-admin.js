const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('reports.db');

async function createAdmin() {
    try {
        const passwordHash = await bcrypt.hash('admin123', 10);
        const email = 'realadmin@cybermetrik.com';
        
        // Remove if exists
        db.prepare("DELETE FROM users WHERE email = ?").run(email);
        
        const result = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)").run(
            'Real Admin',
            email,
            passwordHash,
            'admin'
        );
        console.log('Insert result:', result);
    } catch (e) {
        console.error('Error creating admin:', e);
    } finally {
        db.close();
    }
}

createAdmin();
