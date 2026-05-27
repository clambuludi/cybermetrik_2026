const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
