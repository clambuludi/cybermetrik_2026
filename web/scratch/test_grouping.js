const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const sqlite = new Database(dbPath, { readonly: true });
const rows = sqlite.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();

const getIdNorma = (item) => {
    if (item.id_norma) return item.id_norma;
    if (item.details) {
        const parts = item.details.split(' | ');
        const idPart = parts[0]?.replace('Norma ISO: ', '').trim();
        if (idPart && idPart !== '-') return idPart;
    }
    return '';
};

const getGroupTitle = (prefix, groupItems) => {
    // 1. Try to find if there is an item in the checklist that matches the prefix exactly
    const parentItem = rows.find(item => item.id_norma === prefix);
    if (parentItem) {
        return parentItem.pregunta;
    }

    const firstItem = groupItems[0];
    if (firstItem) {
        const tc = firstItem.tipo_control;
        if (tc && tc !== 'N/A' && tc.toLowerCase() !== 'control' && !tc.toLowerCase().includes('control organizacional') && !tc.toLowerCase().includes('control físico') && !tc.toLowerCase().includes('control tecnológico') && !tc.toLowerCase().includes('control personal')) {
            return tc;
        }
        
        const colonIndex = firstItem.pregunta.indexOf(':');
        if (colonIndex > 0 && colonIndex < 50) {
            return firstItem.pregunta.substring(0, colonIndex).trim();
        }

        if (tc && tc !== 'N/A') {
            return tc;
        }
        return firstItem.pregunta;
    }
    return prefix;
};

const renderList = [];
const processedGroups = new Set();

rows.forEach(item => {
    const idNorma = getIdNorma(item);
    const match = idNorma ? idNorma.match(/^(.+?)([a-zA-Z])$/) : null;
    if (match) {
        const prefix = match[1];
        if (!processedGroups.has(prefix)) {
            processedGroups.add(prefix);
            const groupItems = rows.filter(i => {
                const idN = getIdNorma(i);
                const m = idN ? idN.match(/^(.+?)([a-zA-Z])$/) : null;
                return m && m[1] === prefix;
            });
            const title = getGroupTitle(prefix, groupItems);
            renderList.push({
                type: 'accordion',
                prefix,
                title,
                items: groupItems.map(gi => gi.id_norma)
            });
        }
    } else {
        renderList.push({
            type: 'flat',
            id_norma: item.id_norma
        });
    }
});

console.log("Render list summary:");
console.log(`Total renderList entities: ${renderList.length}`);
console.log("Accordion groups in renderList:");
console.log(renderList.filter(e => e.type === 'accordion'));

sqlite.close();
