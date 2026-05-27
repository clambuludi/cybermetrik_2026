const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const cmRows = cmDb.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE activo = 1 ORDER BY id_norma").all();
cmDb.close();

const rDb = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });
const report = rDb.prepare("SELECT * FROM reports WHERE id = 202").get();
rDb.close();

const parsed = JSON.parse(report.data);
const checked = parsed.checkedItems || parsed;
const oldSlugs = Object.keys(checked);

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

console.log(`Current active questions: ${cmRows.length}`);
console.log(`Old slugs in Report 202: ${oldSlugs.length}`);

const matched = [];
const unmatched = [];

cmRows.forEach(row => {
    const newSlug = generateId(row.pregunta);
    if (checked[newSlug] !== undefined) {
        matched.push({ id_norma: row.id_norma, slug: newSlug });
    } else {
        // Try fuzzy matching: check if any old slug has a high overlap
        let bestMatch = null;
        let highestOverlap = 0;
        
        oldSlugs.forEach(oldSlug => {
            const oldWords = oldSlug.split('-');
            const newWords = newSlug.split('-');
            const intersection = oldWords.filter(w => newWords.includes(w) && w.length > 2);
            const overlap = intersection.length;
            if (overlap > highestOverlap) {
                highestOverlap = overlap;
                bestMatch = oldSlug;
            }
        });
        
        unmatched.push({
            id_norma: row.id_norma,
            currentPregunta: row.pregunta,
            newSlug,
            bestOldSlugMatch: bestMatch,
            overlap: highestOverlap
        });
    }
});

console.log(`\nMatched: ${matched.length}`);
console.log(`Unmatched: ${unmatched.length}`);

console.log("\nSome unmatched examples with best old slug matches:");
unmatched.slice(0, 30).forEach(u => {
    console.log(`\n[${u.id_norma}] New text: "${u.currentPregunta}"`);
    console.log(`  New slug: ${u.newSlug}`);
    console.log(`  Best old: ${u.bestOldSlugMatch} (overlap: ${u.overlap})`);
});
