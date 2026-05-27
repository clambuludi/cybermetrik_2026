const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const generateId = (title) => {
    return title.toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]/g, '');
};

// 1. Get old slugs from report 202
const rDbPath = path.resolve(__dirname, '../../web/reports.db');
const rDb = new Database(rDbPath, { readonly: true });
const report = rDb.prepare("SELECT * FROM reports WHERE id = 202").get();
rDb.close();
const parsed = JSON.parse(report.data);
const checked = parsed.checkedItems || parsed;
const oldSlugs = Object.keys(checked);

// 2. Get current active questions
const cmDbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const cmDb = new Database(cmDbPath, { readonly: true });
const currentQuestions = cmDb.prepare("SELECT id_norma, pregunta FROM preguntas WHERE activo = 1").all();
cmDb.close();

// Build map of id_norma -> current slug
const currentSlugsMap = {};
currentQuestions.forEach(q => {
    currentSlugsMap[q.id_norma] = generateId(q.pregunta);
});

// Let's create an explicit dictionary of old slug -> id_norma
const oldSlugToNorma = {
    // 12 unmapped from first run
    'segregacin-de-tareas': 'A.5.3',
    'recoleccin-de-evidencia': 'A.5.28',
    'actualizar-normativa-consideando-nuevas-leyes-en-mbitos-de-pdp-y-ciberseguridad': 'A.5.31',
    'procedimientos-operacionales-documentados': 'A.5.37',
    'restriccin-de-acceso-a-la-informacin': 'A.8.3',
    'borrado-de-informacin': 'A.8.10',
    'prevencin-de-filtracin-de-datos': 'A.8.12',
    'respaldo-de-informacin': 'A.8.13',
    'registracin': 'A.8.15',
    'sincronizacin-de-reloj-clock': 'A.8.17',
    'requerimientos-de-seguridad-en-aplicaciones': 'A.8.26',
    'generacin-de-cdigo-seguro': 'A.8.28',

    // 19 unmapped from second run
    'utiliza-la-organizacin-sistemas-de-almacenamiento-de-datos-que-permitan-la-recuperacin-de-los-registros-en-un-plazo-y-formato-aceptables-': 'A.5.33.b',
    'trminos-y-condiciones-de-empleo---son-las-verificaciones-de-antecedentes-proporcionales-a-los-requisitos-del-negocio-la-clasificacin-de-la-informacin-a-la-que-se-accede-y-los-riesgos-percibidos': 'A.6.2',
    'se-realizan-verificaciones-de-antecedentes-antes-de-que-el-personal-se-incorpore-a-la-organizacin': 'A.6.1.a',
    'se-realizan-verificaciones-de-antecedentes-de-forma-continua-para-tener-en-cuenta-las-leyes-regulaciones-y-tica-aplicables': 'A.6.1.b',
    'son-las-verificaciones-de-antecedentes-proporcionales-a-los-requisitos-del-negocio-la-clasificacin-de-la-informacin-a-la-que-se-accede-y-los-riesgos-percibidos': 'A.6.1.c',
    'el-personal-y-las-partes-interesadas-pertinentes-reciben-la-formacin-la-capacitacin-y-la-concienciacin-adecuadas-en-seguridad-de-la-informacin': 'A.6.3.a',
    'el-personal-y-las-partes-interesadas-pertinentes-reciben-actualizaciones-peridicas-de-la-poltica-de-seguridad-de-la-informacin-de-la-organizacin-las-polticas-y-los-procedimientos-especficos-para-cada-tema-segn-corresponda-a-su-funcin-laboral': 'A.6.3.b',
    'responsabilidades-luego-de-la-finalizacin-o-cambio-de-empleo---se-han-definido-aplicado-y-comunicado-al-personal-pertinente-y-a-otras-partes-interesadas-las-responsabilidades-y-obligaciones-en-materia-de-seguridad-de-la-informacin-que-siguen-vigentes-tras-la-rescisin-o-el-cambio-de-empleo': 'A.6.5',
    'se-han-identificado-y-documentado-los-acuerdos-de-confidencialidad-o-no-divulgacin-que-reflejan-las-necesidades-de-la-organizacin-en-materia-de-proteccin-de-la-informacin': 'A.6.6.a',
    '-se-revisan-peridicamente-los-acuerdos-de-confidencialidad-o-no-divulgacin': 'A.6.6.b',
    'el-personal-y-otras-partes-interesadas-pertinentes-firman-los-acuerdos-de-confidencialidad-o-no-divulgacin': 'A.6.6.c',
    'se-han-implementado-medidas-de-seguridad-para-el-personal-que-trabaja-a-distancia': 'A.6.7.a',
    'las-medidas-de-seguridad-del-teletrabajo-protegen-adecuadamente-la-informacin-a-la-que-se-accede-procesa-o-almacena-fuera-de-las-instalaciones-de-la-organizacin': 'A.6.7.b',
    'reportes-de-eventos-de-seguridad-de-la-informacin---ha-establecido-la-organizacin-un-mecanismo-para-informar-oportunamente-sobre-eventos-de-seguridad-de-la-informacin-observados-o-sospechosos-a-travs-de-los-canales-adecuados': 'A.6.8',
    'permetros-de-seguridad-fsica---se-definen-y-utilizan-permetros-de-seguridad-para-proteger-las-reas-que-contienen-informacin-y-otros-activos-asociados': 'A.7.1',
    'entrada-fsica---las-reas-seguras-estn-protegidas-por-controles-de-entrada-y-puntos-de-acceso-adecuados': 'A.7.2',
    'seguridad-de-oficinas-despachos-e-instalaciones---se-disea-e-implementa-la-seguridad-fsica-de-oficinas-salas-e-instalaciones': 'A.7.3',
    'supervisin-de-la-seguridad-fsica---se-supervisan-continuamente-las-instalaciones-para-evitar-el-acceso-fsico-no-autorizado': 'A.7.4',
    'proteccin-contra-amenazas-fsicas-y-ambientales---se-disea-e-implementa-la-proteccin-contra-amenazas-fsicas-y-ambientales-como-desastres-naturales-y-otras-amenazas-fsicas-intencionales-o-no-a-la-infraestructura': 'A.7.5',
    'trabajo-en-reas-seguras---se-disean-e-implementan-medidas-de-seguridad-para-trabajar-en-reas-seguras': 'A.7.6',
    'escritorio-y-pantalla-limpios---se-definen-y-aplican-adecuadamente-normas-de-seguridad-para-el-escritorio-y-los-medios-de-almacenamiento-extrables-as-como-normas-de-seguridad-para-las-instalaciones-de-procesamiento-de-informacin': 'A.7.7',
    'emplazamiento-y-proteccin-de-equipos---los-equipos-estn-ubicados-de-forma-segura-y-protegida': 'A.7.8',
    'seguridad-de-activos-fuera-de-las-instalaciones---estn-protegidos-los-activos-fuera-de-las-instalaciones': 'A.7.9',
    'medios-de-almacenamiento---se-gestionan-los-medios-de-almacenamiento-a-lo-largo-de-su-ciclo-de-vida-adquisicin-uso-transporte-y-eliminacin-de-acuerdo-con-el-esquema-de-clasificacin-y-los-requisitos-de-manejo-de-la-organizacin': 'A.7.10',
    'servicios-de-suministro---las-instalaciones-de-procesamiento-de-informacin-estn-protegidas-contra-cortes-de-energa-y-otras-interrupciones-causadas-por-fallas-en-los-servicios-pblicos': 'A.7.11',
    'seguridad-del-cableado---los-cables-que-transportan-energa-datos-o-servicios-de-informacin-de-apoyo-estn-protegidos-contra-interceptaciones-interferencias-o-daos': 'A.7.12',
    'mantenimiento-de-equipos---se-realiza-un-mantenimiento-adecuado-de-los-equipos-para-garantizar-la-disponibilidad-integridad-y-confidencialidad-de-la-informacin-': 'A.7.13',
    'eliminacin-o-re-utilizacin-segura-de-equipos---se-verifican-los-equipos-que-contienen-medios-de-almacenamiento-para-garantizar-que-todos-los-datos-confidenciales-y-el-software-con-licencia-se-hayan-eliminado-o-sobrescrito-de-forma-segura-antes-de-su-eliminacin-o-reutilizacin': 'A.7.14',
    'ha-implementado-la-organizacin-proteccin-contra-malware': 'A.8.7.a',
    'el-enfoque-de-la-organizacin-para-la-proteccin-contra-malware-se-sustenta-en-una-adecuada-concienciacin-de-los-usuarios': 'A.8.7.b',
    'se-obtiene-informacin-sobre-las-vulnerabilidades-tcnicas-de-los-sistemas-de-informacin-en-uso': 'A.8.8.a',
    'evala-la-organizacin-su-exposicin-a-vulnerabilidades-tcnicas-y-toma-las-medidas-adecuadas': 'A.8.8.b'
};

// Also let's construct the rest of the mapping programmatically using the generate_perfect_mapping code
const csvContent = fs.readFileSync(path.resolve(__dirname, '../../base_preguntas.csv'), 'utf-8');
const lines = csvContent.split('\n');
const tempCatalog = {};
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = [];
    let currentField = '';
    let insideQuotes = false;
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') insideQuotes = !insideQuotes;
        else if (char === ',' && !insideQuotes) {
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField.trim());
    if (fields.length >= 5) {
        tempCatalog[generateId(fields[4])] = fields[1];
    }
}

// Parse update scripts helper
function parseToCatalog(filename, idPrefix) {
    const filePath = path.resolve(__dirname, '../../web', filename);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/const rawData = `([\s\S]+?)`;/);
    if (!match) return;
    match[1].split('\n').filter(l => l.trim() !== '').forEach(line => {
        const partsMatch = line.trim().match(/^([^\s]+)\s+(.*)$/);
        if (!partsMatch) return;
        let id = partsMatch[1].trim();
        let text = partsMatch[2].trim();
        if (text.startsWith('"')) text = text.substring(1);
        if (text.endsWith('"')) text = text.substring(0, text.length - 1);
        text = text.trim();
        
        let standardId = id;
        if (idPrefix === 'A.5' && id.match(/^\d/)) {
            const parts = id.match(/^5\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.5.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        } else if (idPrefix === 'A.6' && id.match(/^\d/)) {
            const parts = id.match(/^6\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.6.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        } else if (idPrefix === 'A.7' && id.match(/^\d/)) {
            const parts = id.match(/^7\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.7.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        } else if (idPrefix === 'A.8' && id.match(/^\d/)) {
            const parts = id.match(/^8\.(\d+)([a-z])?$/);
            if (parts) standardId = `A.8.${parts[1]}` + (parts[2] ? `.${parts[2]}` : '');
        }
        
        tempCatalog[generateId(text)] = standardId;
    });
}
parseToCatalog('update_dominio5.js', 'A.5');
parseToCatalog('update_dominio6.js', 'A.6');
parseToCatalog('update_dominio7.js', 'A.7');
parseToCatalog('update_dominio8.js', 'A.8');

// EGSI from migrate_egsi.js
const migrateContent = fs.readFileSync(path.resolve(__dirname, '../../web/migrate_egsi.js'), 'utf-8');
const egsiMatches = migrateContent.matchAll(/\['(EGSI\.\d+\.\d+)', '[^']+', '[^']+', '([^']+)'/g);
for (const m of egsiMatches) {
    tempCatalog[generateId(m[2])] = m[1];
}

// Cláusulas from fix_clausulas.js
const fixClausulasContent = fs.readFileSync(path.resolve(__dirname, '../../web/fix_clausulas.js'), 'utf-8');
const clausesMatches = fixClausulasContent.matchAll(/id:\s*"([^"]+)",\s*componente:\s*"[^"]+",\s*pregunta:\s*"([^"]+)"/g);
for (const m of clausesMatches) {
    tempCatalog[generateId(m[2])] = m[1];
}

// Now map every old slug to the standard id_norma
const oldSlugToNewSlugMap = {};

oldSlugs.forEach(slug => {
    let norma = oldSlugToNorma[slug] || tempCatalog[slug];
    if (!norma) {
        // Try trimming accents or hyphens
        const clean = slug.replace(/^-+|-+$/g, '');
        norma = oldSlugToNorma[clean] || tempCatalog[clean];
    }
    
    if (norma) {
        // Look up the current active question slug for this id_norma
        let newSlug = currentSlugsMap[norma];
        if (!newSlug && norma.startsWith('ISO-')) {
            // E.g. ISO-01 corresponds to Clausula 4.a or similar?
            // Let's check how the Clauses are mapped in the current db:
            // ISO-01 Contexto de la organización -> Clausula 4.a? Let's check:
            // Clausula 4.a: ¿Ha determinado la organización los problemas externos e internos...?
            // Yes! Let's check:
            const numPart = parseInt(norma.substring(4), 10);
            const clausesNormas = [
                'Clausula 4.a', 'Clausula 4.b', 'Clausula 4.c', 'Clausula 4.d',
                'Clausula 5.a', 'Clausula 5.b', 'Clausula 5.c',
                'Clausula 6.a', 'Clausula 6.b', 'Clausula 6.c', 'Clausula 6.d', 'Clausula 6.e',
                'Clausula 7.a', 'Clausula 7.b', 'Clausula 7.c', 'Clausula 7.d', 'Clausula 7.e', 'Clausula 7.f',
                'Clausula 8.a', 'Clausula 8.b', 'Clausula 8.c',
                'Clausula 9.a', 'Clausula 9.b', 'Clausula 9.c', 'Clausula 9.d', 'Clausula 9.e',
                'Clausula 10.a', 'Clausula 10.b'
            ];
            
            // Map ISO-01..12 to the active ones
            if (numPart >= 1 && numPart <= 12) {
                const mapIsoToActive = {
                    1: 'Clausula 4.a',
                    2: 'Clausula 4.b',
                    3: 'Clausula 4.c',
                    4: 'Clausula 4.d',
                    5: 'Clausula 5.a', // demuestra liderazgo
                    6: 'Clausula 5.b', // política de seguridad
                    7: 'Clausula 5.c', // roles y responsabilidades
                    8: 'Clausula 6.a', // acciones frente a riesgos
                    9: 'Clausula 6.a', // formal eval de riesgos
                    10: 'Clausula 6.b', // tratamiento de riesgos
                    11: 'Clausula 6.d', // objetivos de seguridad
                    12: 'Clausula 6.e'  // planificación de cambios
                };
                const activeNorma = mapIsoToActive[numPart];
                newSlug = currentSlugsMap[activeNorma];
            }
        }
        
        if (newSlug) {
            oldSlugToNewSlugMap[slug] = newSlug;
        } else {
            console.log(`Warning: Found norma ${norma} for slug ${slug} but no active new question slug!`);
        }
    } else {
        console.log(`Warning: Could not map slug ${slug} to any norma!`);
    }
});

console.log(`\nGenerated map with ${Object.keys(oldSlugToNewSlugMap).length} entries out of ${oldSlugs.length} old slugs.`);

// Save to a JSON file so we can read it easily
fs.writeFileSync(
    path.resolve(__dirname, '../../web/src/utils/slug-mapping-data.json'),
    JSON.stringify(oldSlugToNewSlugMap, null, 2),
    'utf-8'
);
console.log("Saved slug-mapping-data.json successfully!");
