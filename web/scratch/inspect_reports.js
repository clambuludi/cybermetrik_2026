const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const user = reportsDb.prepare("SELECT * FROM users WHERE email = ?").get("evaluacion@gmail.com");
if (!user) {
    console.error("User not found!");
    process.exit(1);
}

const reports = reportsDb.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC").all(user.id);
console.log(`Total reports for user: ${reports.length}`);

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));
const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

reports.forEach(r => {
    console.log(`\nReport ID: ${r.id} | Score: ${r.score}% | Created At: ${r.createdAt}`);
    const data = JSON.parse(r.data);
    const parcial = r.progresoParcialDecimal ? JSON.parse(r.progresoParcialDecimal) : {};
    
    // Find the slug of A.5.7.c
    // Let's look for any key in data or parcial related to A.5.7.c
    // A.5.7.c question is: "¿Comparte la organización inteligencia sobre amenazas con otras organizaciones para mejorar la inteligencia sobre amenazas en general?"
    const targetSlug = "comparte-la-organizacin-inteligencia-sobre-amenazas-con-otras-organizaciones-para-mejorar-la-inteligencia-sobre-amenazas-en-general";
    
    // Let's print the key/values
    console.log(` - checkedItems['${targetSlug}'] = ${data.checkedItems ? data.checkedItems[targetSlug] : data[targetSlug]}`);
    console.log(` - evidenceLinks['${targetSlug}'] = ${data.evidenceLinks ? data.evidenceLinks[targetSlug] : 'N/A'}`);
    
    // Find in parcial:
    // Let's search by original slug or mapped slug
    const mappedSlug = Object.keys(mapping).find(k => mapping[k] === targetSlug) || targetSlug;
    console.log(` - Mapped key: ${mappedSlug}`);
    console.log(` - parcial['${targetSlug}'] = ${parcial[targetSlug]}`);
    console.log(` - parcial['${mappedSlug}'] = ${parcial[mappedSlug]}`);
    console.log(` - All parcial keys:`, Object.keys(parcial).filter(k => k.includes("comparte") || k.includes("amenazas")));
});

reportsDb.close();
