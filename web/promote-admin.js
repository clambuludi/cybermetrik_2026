const Database = require('better-sqlite3');
const db = new Database('reports.db');

try {
    const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = 'test@example.com'").run();
    console.log('Update result:', result);
} catch (e) {
    console.error('Error updating user:', e);
} finally {
    db.close();
}
