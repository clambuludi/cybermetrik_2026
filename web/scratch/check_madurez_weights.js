const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const rows = db.prepare("SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr, pregunta FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// 1. Group checklist items by parent/flat structure
const grouped = rows.reduce((acc, row) => {
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
    acc[dom].push(row);
    return acc;
}, {});

const sections = Object.entries(grouped).map(([dom, items]) => ({
    title: dom,
    checklist: items
}));

const phaseWeights = { 6: 0, 7: 0, 8: 0, 9: 0 };
const phaseCount = { 6: 0, 7: 0, 8: 0, 9: 0 };

for (const section of sections) {
    const childrenMap = new Map();
    const parentItems = [];

    section.checklist.forEach(item => {
        const idNorma = item.id_norma;
        if (typeof idNorma === 'string' && idNorma.trim() !== '') {
            const match = idNorma.trim().match(SUB_ITEM_REGEX);
            if (match) {
                const parentId = match[1];
                if (!childrenMap.has(parentId)) {
                    childrenMap.set(parentId, []);
                }
                childrenMap.get(parentId).push(item);
            } else {
                parentItems.push(item);
            }
        } else {
            parentItems.push(item);
        }
    });

    parentItems.forEach(parent => {
        const parentIdNorma = parent.id_norma?.trim() || '';
        const children = childrenMap.get(parentIdNorma) || [];

        let weight = 0;
        if (children.length > 0) {
            weight = Number(children[0].peso_gpr) || 0;
        } else {
            weight = Number(parent.peso_gpr) || 0;
        }

        const idEgsi = Number(parent.id_dominio_egsi);
        if (idEgsi >= 6 && idEgsi <= 9) {
            phaseWeights[idEgsi] += weight;
            phaseCount[idEgsi]++;
        }
    });
}

console.log("EGSI Phase Weights from madurez.ts logic:");
console.log("Phase 6 (Fase 1): Weight Sum =", phaseWeights[6], ", Count =", phaseCount[6]);
console.log("Phase 7 (Fase 2): Weight Sum =", phaseWeights[7], ", Count =", phaseCount[7]);
console.log("Phase 8 (Fase 3): Weight Sum =", phaseWeights[8], ", Count =", phaseCount[8]);
console.log("Phase 9 (Fase 4): Weight Sum =", phaseWeights[9], ", Count =", phaseCount[9]);
console.log("Total EGSI Weight Sum =", phaseWeights[6] + phaseWeights[7] + phaseWeights[8] + phaseWeights[9]);

db.close();
