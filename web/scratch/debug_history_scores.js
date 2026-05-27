const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../web/reports.db'), { readonly: true });

// We need the sections. We can read them by querying the cybermetrik.db questions.
const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const cmRows = cmDb.prepare("SELECT * FROM preguntas WHERE activo = 1").all();
cmDb.close();

// Group like layout.tsx
const grouped = cmRows.reduce((acc, row) => {
  let dom = row.dominio;
  if (!dom || dom === 'Dominio General' || dom.trim() === '') {
    const id_norma = (row.id_norma || '').toString();
    if (id_norma.startsWith('5.')) {
      dom = 'Dominio 5: Organizacional';
    } else if (id_norma.startsWith('6.')) {
      dom = 'Dominio 6: Personas';
    } else if (id_norma.startsWith('7.')) {
      dom = 'Dominio 7: Físico';
    } else if (id_norma.startsWith('8.')) {
      dom = 'Dominio 8: Tecnológico';
    } else {
      dom = 'Cláusulas ISO 27001';
    }
  }
  if (!acc[dom]) acc[dom] = [];
  acc[dom].push({
    point: row.pregunta,
    id_norma: row.id_norma,
    id_dominio_egsi: row.id_dominio_egsi,
    peso_gpr: row.peso_gpr
  });
  return acc;
}, {});

const sections = [];
for (const [dom, items] of Object.entries(grouped)) {
  sections.push({
    title: dom,
    checklist: items
  });
}

// Now read reports
const reports = db.prepare("SELECT * FROM reports WHERE id IN (202, 206)").all();
db.close();

reports.forEach(report => {
    console.log(`\n--- Report ID: ${report.id} ---`);
    console.log("Completed count:", report.completed_count);
    console.log("Total count:", report.total_count);
    console.log("Stored score:", report.score);

    const parsed = JSON.parse(report.data);
    const checkedItems = parsed.checkedItems || parsed;
    const ignoredItems = parsed.ignoredItems || {};
    const evidenceLinks = parsed.evidenceLinks || {};
    const progresoParcialDecimal = parsed.progresoParcialDecimal || {};

    let isoDone = 0;
    const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

    sections.forEach(section => {
        const isClausesSection = section.title === 'Cláusulas ISO 27001';
        const isIsoSection = !section.title.includes('EGSI FASE');
        if (!isIsoSection) return;

        section.checklist.forEach(item => {
            const itemId = generateId(item.point);
            const isIgnored = ignoredItems[itemId];
            if (isIgnored) return;

            const val = checkedItems[itemId];
            const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
            const hasDriveLink = !!evidenceLinks[itemId];

            const partialVal = progresoParcialDecimal[itemId];
            const pValue = partialVal !== undefined && partialVal !== null
              ? Number(partialVal)
              : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

            let finalScore = 0.0;
            if (numericVal === 1.0) {
                finalScore = 1.0;
            } else if (numericVal === 0.5) {
                finalScore = pValue;
            }

            if (isClausesSection) {
                const idNorma = item.id_norma;
                if (typeof idNorma === 'string' && idNorma.trim() !== '') {
                    const match = idNorma.trim().match(SUB_ITEM_REGEX);
                    if (match) {
                        if (numericVal === 1.0 || numericVal === 0.5) {
                            if (hasDriveLink) {
                                isoDone += pValue;
                            } else {
                                isoDone += pValue * 0.4;
                            }
                        }
                    }
                }
            } else {
                // Annex A leaves
                const idNorma = item.id_norma?.trim() || '';
                const parentIdsWithChildren = new Set();
                section.checklist.forEach(i => {
                    const match = i.id_norma?.trim().match(SUB_ITEM_REGEX);
                    if (match) parentIdsWithChildren.add(match[1]);
                });
                const isParent = idNorma && parentIdsWithChildren.has(idNorma);
                if (!isParent) {
                    isoDone += finalScore;
                }
            }
        });
    });

    const generalIsoScore = Math.min(100, Math.round((isoDone / 161) * 100));
    console.log("Calculated isoDone:", isoDone);
    console.log("Calculated generalIsoScore:", generalIsoScore);
});
