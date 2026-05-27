const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE activo = 1").all();
db.close();

const seen = {};
const dupes = [];

rows.forEach(r => {
    if (!r.id_norma) return;
    const norm = r.id_norma.trim();
    if (seen[norm]) {
        dupes.push({
            id_norma: norm,
            first_pregunta: seen[norm].pregunta,
            second_pregunta: r.pregunta
        });
    } else {
        seen[norm] = r;
    }
});

console.log("Total questions:", rows.length);
console.log("Total unique id_norma:", Object.keys(seen).length);
console.log("Duplicate id_norma count:", dupes.length);
if (dupes.length > 0) {
    console.log("Duplicates list:");
    console.log(dupes);
}
