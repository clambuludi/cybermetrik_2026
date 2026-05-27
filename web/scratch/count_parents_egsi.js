const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const rows = db.prepare(`
    SELECT id, id_norma, dominio, id_dominio_egsi, activo
    FROM preguntas 
    WHERE activo = 1
`).all();

const childrenMap = new Map();
const parentItems = [];

rows.forEach(item => {
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

let totalParentsInEGSI7 = 0;
let totalChildrenInEGSI7 = 0;

parentItems.forEach(parent => {
    const parentIdNorma = parent.id_norma?.trim() || '';
    const children = childrenMap.get(parentIdNorma) || [];
    
    if (Number(parent.id_dominio_egsi) === 7) {
        totalParentsInEGSI7++;
        if (children.length > 0) {
            totalChildrenInEGSI7 += children.length;
        }
    }
});

console.log("Total Parent Controls (e.g. A.5.1) in id_dominio_egsi = 7:", totalParentsInEGSI7);
console.log("Total Child/Individual controls (leaves) in id_dominio_egsi = 7:", totalChildrenInEGSI7);

// Let's count how many parents exist in Annex A domains (A5, A6, A7, A8)
let totalParentsInAnnexA = 0;
parentItems.forEach(parent => {
    const isAnnexA = parent.id_norma?.startsWith('A.');
    if (isAnnexA) {
        totalParentsInAnnexA++;
    }
});
console.log("Total Parent Controls in Annex A (A5, A6, A7, A8):", totalParentsInAnnexA);

db.close();
