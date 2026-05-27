const Database = require('better-sqlite3');
const path = require('path');

const rDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const user = rDb.prepare("SELECT * FROM users WHERE email = 'evaluacion@gmail.com'").get();
console.log("User:", user);

if (user) {
    const userReports = rDb.prepare("SELECT id, userId, score, createdAt FROM reports WHERE userId = ? ORDER BY id DESC").all(user.id);
    console.log("Reports:", userReports);
}

rDb.close();
