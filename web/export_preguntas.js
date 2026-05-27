const fs = require('fs');
const db = require('better-sqlite3')('../instance/cybermetrik.db');
const rows = db.prepare('SELECT id, id_norma, tipo_control, dominio, pregunta FROM preguntas WHERE activo = 1 ORDER BY id_norma').all();

let md = '# Base de Preguntas ISO 27001\n\n| ID | ID Norma | Dominio / Control | Pregunta (Como lo ve el usuario) |\n|---|---|---|---|\n';
let csv = 'ID,ID_Norma,Dominio,Tipo_Control,Pregunta\n';

rows.forEach(r => {
    // Markdown
    md += `| ${r.id} | ${r.id_norma} | **${r.dominio}**<br>${r.tipo_control} | ${r.pregunta} |\n`;
    
    // CSV - sanitize quotes
    const s_norma = (r.id_norma || '').toString().replace(/"/g, '""');
    const s_dominio = (r.dominio || '').toString().replace(/"/g, '""');
    const s_control = (r.tipo_control || '').toString().replace(/"/g, '""');
    const s_pregunta = (r.pregunta || '').toString().replace(/"/g, '""');
    csv += `${r.id},"${s_norma}","${s_dominio}","${s_control}","${s_pregunta}"\n`;
});

fs.writeFileSync('../base_preguntas.md', md);
fs.writeFileSync('../base_preguntas.csv', csv);
console.log('Files generated: base_preguntas.md and base_preguntas.csv');
