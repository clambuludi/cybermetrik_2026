const Database = require('better-sqlite3');
const db = new Database('reports.db');

try {
    const users = db.prepare('SELECT id, name, email, role FROM users').all();
    console.log('USERS_START');
    console.log(JSON.stringify(users));
    console.log('USERS_END');
} catch (e) {
    console.error('Error reading users:', e);
} finally {
    db.close();
}
