const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const db = new Database(dbPath, { readonly: true });

const items = db.prepare(`
    SELECT id, id_norma, pregunta, id_dominio_egsi, peso_gpr, activo
    FROM preguntas 
    WHERE id_dominio_egsi = 8 AND activo = 1
`).all();

console.log(`Fase 3: Found ${items.length} items.`);

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

let obtainedGPRPoints = 0;
let totalGPRWeight = 0;

items.forEach(item => {
    const id = generateId(item.pregunta);
    const peso = Number(item.peso_gpr) || 0;
    
    // Assume progress is empty (0)
    const numericVal = 0.0;
    const hasLink = false;
    const pValue = 0.0;
    let finalScore = 0.0;

    obtainedGPRPoints += finalScore * peso;
    totalGPRWeight += peso;
    
    console.log(`Item: ${item.id_norma} | Weight: ${peso} | ID: ${id}`);
});

console.log(`Obtained Points: ${obtainedGPRPoints}`);
console.log(`Total Weight: ${totalGPRWeight}`);
const score = totalGPRWeight === 0 ? 0 : Math.round((obtainedGPRPoints / totalGPRWeight) * 100);
console.log(`Calculated Score: ${score}%`);

db.close();
