const http = require('http');
http.get('http://localhost:5173/checklist/ejecucion-a5-controles-organizacionales/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // just regex match all id_norma spans inside bg-gray-800
    // <span class="text-xs font-mono bg-gray-800/80 px-1.5 py-0.5 rounded text-gray-400 font-black">A.5.1</span>
    const regex = /<span class="text-xs font-mono bg-gray-800\/80[^>]*>([^<]+)<\/span>/g;
    let match;
    const items = [];
    while ((match = regex.exec(data)) !== null) {
      items.push(match[1].trim());
    }
    console.log("Flat Items (Comboboxes) rendered:", items.length);
    console.log(items.slice(0, 20).join(', '));

    const accordionRegex = /<span class="text-xs font-black text-cyan-400 bg-cyan-900\/30[^>]*>([^<]+)<\/span>/g;
    const accordions = [];
    while ((match = accordionRegex.exec(data)) !== null) {
      accordions.push(match[1].trim());
    }
    console.log("\nAccordions rendered:", accordions.length);
    console.log(accordions.slice(0, 20).join(', '));
  });
}).on('error', err => console.log("Error:", err.message));
