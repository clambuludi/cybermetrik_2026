const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

const rows = db.prepare(`
    SELECT id, id_norma, dominio, id_dominio_egsi, activo, pregunta
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

let isoTotal = 0;
let isoIgnored = 0;

parentItems.forEach(parent => {
    const isIso = !parent.title?.includes('EGSI FASE') && (parent.id_norma?.startsWith('A.') || !parent.id_norma?.startsWith('EGSI.'));
    const isAnnexA = parent.id_norma?.startsWith('A.');
    
    if (isAnnexA) {
        const children = childrenMap.get(parent.id_norma.trim()) || [];
        if (children.length > 0) {
            isoTotal += children.length; // Count children!
        } else {
            isoTotal += 1; // Count parent if no children!
        }
    }
});

console.log("Total Annex A controls (counting leaf nodes):", isoTotal);

db.close();
