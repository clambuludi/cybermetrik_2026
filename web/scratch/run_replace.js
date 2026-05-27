const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'generate_hardcoded_slug_map.js');
let content = fs.readFileSync(file, 'utf-8');

const lines = content.split('\n');
let replaced = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("'A.7.14'")) {
        lines[i] = "    'eliminacin-o-re-utilizacin-segura-de-equipos---se-verifican-los-equipos-que-contienen-medios-de-almacenamiento-para-garantizar-que-todos-los-datos-confidenciales-y-el-software-con-licencia-se-hayan-eliminado-o-sobrescrito-de-forma-segura-antes-de-su-eliminacin-o-reutilizacin': 'A.7.14',";
        replaced = true;
        break;
    }
}

if (replaced) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
    console.log("Replacement successful!");
} else {
    console.log("Line containing 'A.7.14' not found!");
}
