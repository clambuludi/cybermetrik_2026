const Database = require('better-sqlite3');
const path = require('path');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const currentQuestions = cmDb.prepare("SELECT id, id_norma, pregunta FROM preguntas WHERE activo = 1").all();
cmDb.close();

const rDb = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });
const report = rDb.prepare("SELECT * FROM reports WHERE id = 202").get();
rDb.close();

const parsed = JSON.parse(report.data);
const checked = parsed.checkedItems || parsed;
const oldSlugs = Object.keys(checked);

// Normalizes text by converting to lowercase, removing accents and non-alphanumeric chars
const normalizeText = (text) => {
    return text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, " ") // replace non-alphanumeric with spaces
        .replace(/\s+/g, " ") // collapse multiple spaces
        .trim();
};

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const mapped = [];
const unmapped = [];

oldSlugs.forEach(oldSlug => {
    // 1. Check exact match
    const exactQuestion = currentQuestions.find(q => generateId(q.pregunta) === oldSlug);
    if (exactQuestion) {
        mapped.push({
            oldSlug,
            id_norma: exactQuestion.id_norma,
            newPregunta: exactQuestion.pregunta,
            newSlug: generateId(exactQuestion.pregunta),
            method: 'EXACT'
        });
        return;
    }

    // 2. Try fuzzy text match
    const normalizedOld = oldSlug.replace(/-/g, ' ');
    let bestMatch = null;
    let highestOverlap = 0;

    currentQuestions.forEach(q => {
        const normalizedNew = normalizeText(q.pregunta);
        
        // Count overlapping words
        const oldWords = normalizedOld.split(' ').filter(w => w.length > 2);
        const newWords = normalizedNew.split(' ').filter(w => w.length > 2);
        
        const intersection = oldWords.filter(w => newWords.includes(w));
        const overlap = intersection.length;

        if (overlap > highestOverlap) {
            highestOverlap = overlap;
            bestMatch = q;
        }
    });

    // Accept match if the word overlap is significant (e.g. > 3 matching words or > 40% overlap)
    const oldWordsCount = normalizedOld.split(' ').filter(w => w.length > 2).length;
    const isGoodMatch = highestOverlap >= 3 || (oldWordsCount > 0 && (highestOverlap / oldWordsCount) >= 0.4);

    if (bestMatch && isGoodMatch) {
        mapped.push({
            oldSlug,
            id_norma: bestMatch.id_norma,
            newPregunta: bestMatch.pregunta,
            newSlug: generateId(bestMatch.pregunta),
            method: 'FUZZY',
            overlap: highestOverlap
        });
    } else {
        unmapped.push({
            oldSlug,
            bestCandidate: bestMatch ? bestMatch.pregunta : 'None',
            bestCandidateNorma: bestMatch ? bestMatch.id_norma : 'None',
            overlap: highestOverlap
        });
    }
});

console.log(`Mapped: ${mapped.length} / ${oldSlugs.length}`);
console.log(`Unmapped: ${unmapped.length}`);

if (unmapped.length > 0) {
    console.log("\nUnmapped details:");
    console.log(unmapped);
} else {
    console.log("\nAll items successfully mapped!");
}
