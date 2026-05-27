const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare(`SELECT * FROM preguntas`).all();
console.log(`Total questions in DB: ${rows.length}`);
console.log("Check for letters in id_norma (e.g. A.5.1a or 5.1a or similar):");
const withLetters = rows.filter(r => /[a-z]$/i.test(r.id_norma || ''));
console.log(`Found ${withLetters.length} items:`, withLetters.map(r => ({ id: r.id, id_norma: r.id_norma, pregunta: r.pregunta })));

console.log("\nCheck for letters in any other way:");
const testRegex = /[0-9]+\.[0-9]+[a-z]/i;
const matchedPregunta = rows.filter(r => testRegex.test(r.pregunta || '') || testRegex.test(r.id_norma || ''));
console.log(`Found ${matchedPregunta.length} items by regex:`, matchedPregunta.map(r => ({ id: r.id, id_norma: r.id_norma, pregunta: r.pregunta })));

sqlite.close();
