const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'), { readonly: true });

try {
  cmDb.transaction(() => {
    // 1. Apply all fixes including A.8.16.a
    cmDb.prepare("UPDATE preguntas SET pregunta = 'Segregación de tareas, documentado e implementado' WHERE id_norma = 'A.5.3'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = 'Contacto con grupos de interés especial, documentado e implementado' WHERE id_norma = 'A.5.6'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = '¿La organización toma medidas contra el personal y otras partes interesadas pertinentes que han cometido una infracción de la política de seguridad de la información?' WHERE id_norma = 'A.6.4.b'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = '¿Se supervisan y revisan las configuraciones, incluidas las de seguridad, de hardware, software, servicios y redes?' WHERE id_norma = 'A.8.9.b'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = '¿La organización supervisa las redes, los sistemas y las aplicaciones para detectar comportamientos anómalos y evaluar posibles incidentes de seguridad de la información?' WHERE id_norma = 'A.8.16.a'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = 'Contacto con las autoridades, documentado e implementado' WHERE id_norma = 'A.5.5'").run();

    console.log("Applied all question text fixes (including A.8.16.a and A.5.5 typo) in transaction.");

    // Load updated active questions
    const rows = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
    const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

    // Rebuild currentSlugsMap
    const currentSlugsMap = {};
    rows.forEach(q => {
        currentSlugsMap[q.id_norma] = generateId(q.pregunta);
    });

    // Rebuild tempCatalog to simulate generate_hardcoded_slug_map.js
    const tempCatalog = {};
    
    // Parse update scripts
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

    // CSV base questions
    const csvContent = fs.readFileSync(path.resolve(__dirname, '../../base_preguntas.csv'), 'utf-8');
    const csvLines = csvContent.split('\n');
    for (let i = 1; i < csvLines.length; i++) {
        const line = csvLines[i].trim();
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

    // Explicit dictionary of old slug -> id_norma
    const oldSlugToNorma = {
        'segregacin-de-tareas': 'A.5.3',
        'contacto-con-las-autoridades': 'A.5.5',
        'contacto-con-grupos-de-inters-especial': 'A.5.6',
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
        'utiliza-la-organizacin-sistemas-de-almacenamiento-de-datos-que-permitan-la-recuperacin-de-los-registros-en-un-plazo-y-formato-aceptables-': 'A.5.33.b',
        'trminos-y-condiciones-de-empleo---son-las-verificaciones-de-antecedentes-proporcionales-a-los-requisitos-del-negocio-la-clasificacin-de-la-informacin-a-la-que-se-accede-y-los-riesgos-percibidos': 'A.6.1.c',
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

    const oldSlugToNewSlugMap = {};
    const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
    const parsedBefore = JSON.parse(targetReport.data);
    const oldSlugs = Object.keys(parsedBefore.checkedItems || parsedBefore);

    oldSlugs.forEach(slug => {
        let norma = oldSlugToNorma[slug] || tempCatalog[slug];
        if (!norma) {
            const clean = slug.replace(/^-+|-+$/g, '');
            norma = oldSlugToNorma[clean] || tempCatalog[clean];
        }
        if (norma) {
            let newSlug = currentSlugsMap[norma];
            if (newSlug) {
                oldSlugToNewSlugMap[slug] = newSlug;
            }
        }
    });

    // Group active questions
    const grouped = rows.reduce((acc, row) => {
      let dom = row.dominio;
      if (!dom || dom === 'Dominio General' || dom.trim() === '') {
        const id_norma = (row.id_norma || '').toString();
        if (id_norma.startsWith('5.')) dom = 'Dominio 5: Organizacional';
        else if (id_norma.startsWith('6.')) dom = 'Dominio 6: Personas';
        else if (id_norma.startsWith('7.')) dom = 'Dominio 7: Físico';
        else if (id_norma.startsWith('8.')) dom = 'Dominio 8: Tecnológico';
        else dom = 'Cláusulas ISO 27001';
      }
      if (!acc[dom]) acc[dom] = [];
      acc[dom].push({
        point: row.pregunta,
        id_norma: row.id_norma,
        id_dominio_egsi: row.id_dominio_egsi,
        peso_gpr: row.peso_gpr,
        sectionTitle: dom
      });
      return acc;
    }, {});

    const sections = [];
    for (const [dom, items] of Object.entries(grouped)) {
      sections.push({ title: dom, checklist: items });
    }

    // Helper to map keys
    function translate(parsedData) {
      const result = { ...parsedData };
      const mapRecord = (record) => {
        if (!record || typeof record !== 'object') return record;
        const newRecord = {};
        for (const key of Object.keys(record)) {
          const mappedKey = oldSlugToNewSlugMap[key] || key;
          newRecord[mappedKey] = record[key];
        }
        return newRecord;
      };
      if (result.checkedItems) result.checkedItems = mapRecord(result.checkedItems);
      if (result.progresoParcialDecimal) result.progresoParcialDecimal = mapRecord(result.progresoParcialDecimal);
      if (result.ignoredItems) result.ignoredItems = mapRecord(result.ignoredItems);
      if (result.evidenceLinks) result.evidenceLinks = mapRecord(result.evidenceLinks);
      return result;
    }

    const parsedAfter = translate(parsedBefore);
    const progressAfter = {
      completed: parsedAfter.checkedItems || parsedAfter || {},
      ignored: parsedAfter.ignoredItems || {},
      evidenceLinks: parsedAfter.evidenceLinks || {},
      progresoParcialDecimal: parsedAfter.progresoParcialDecimal || {}
    };

    // Calculate scores (using same logic as verify_translation.js)
    function calcularPuntajesConsistentes(sections, progress) {
      let isoSumOfControlScores = 0;
      let isoIgnoredControlsCount = 0;
      let egsiObtainedPoints = 0;
      let egsiIgnoredWeight = 0;
      let clausesPointsSum = 0;
      const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

      for (const section of sections) {
        if (!section?.checklist) continue;
        const isIsoSection = !section.title.includes('EGSI FASE');
        const isClausesSection = section.title === 'Cláusulas ISO 27001';
        const childrenMap = new Map();
        const parentItems = [];

        section.checklist.forEach((item) => {
          const idNorma = item.id_norma;
          if (typeof idNorma === 'string' && idNorma.trim() !== '') {
            const match = idNorma.trim().match(SUB_ITEM_REGEX);
            if (match) {
              const parentId = match[1];
              if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
              childrenMap.get(parentId).push(item);
            } else {
              parentItems.push(item);
            }
          } else {
            parentItems.push(item);
          }
        });

        const getSingleItemScore = (item) => {
          const itemId = generateId(item.point);
          if (progress.ignored[itemId]) return { score: 0, isIgnored: true };
          const val = progress.completed[itemId];
          const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
          const partialVal = progress.progresoParcialDecimal?.[itemId];
          const pValue = partialVal !== undefined && partialVal !== null ? Number(partialVal) : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
          return { score: numericVal === 1.0 ? 100 : numericVal === 0.5 ? Math.round(pValue * 100) : 0, isIgnored: false };
        };

        parentItems.forEach(parent => {
          const parentIdNorma = parent.id_norma?.trim() || '';
          const children = childrenMap.get(parentIdNorma) || [];
          if (children.length > 0) {
            let sumScores = 0;
            let activeChildrenCount = 0;
            let parentIgnored = true;
            children.forEach(child => {
              const childId = generateId(child.point);
              if (!progress.ignored[childId]) parentIgnored = false;
            });
            children.forEach(child => {
              const { score, isIgnored } = getSingleItemScore(child);
              if (!isIgnored) {
                sumScores += score;
                activeChildrenCount++;
              }
            });
            if (!parentIgnored) {
              const parentScore = activeChildrenCount > 0 ? (sumScores / activeChildrenCount) : 0;
              if (isIsoSection) isoSumOfControlScores += parentScore;
              const idEgsi = Number(parent.id_dominio_egsi);
              if (idEgsi >= 6 && idEgsi <= 9) {
                const weight = Number(children[0].peso_gpr) || 0;
                egsiObtainedPoints += parentScore * weight;
              }
            } else {
              if (isIsoSection) isoIgnoredControlsCount++;
              const idEgsi = Number(parent.id_dominio_egsi);
              if (idEgsi >= 6 && idEgsi <= 9) {
                const weight = Number(children[0].peso_gpr) || 0;
                egsiIgnoredWeight += weight;
              }
            }
          } else {
            const { score, isIgnored } = getSingleItemScore(parent);
            const weight = Number(parent.peso_gpr) || 0;
            if (isIgnored) {
              if (isIsoSection) isoIgnoredControlsCount++;
              const idEgsi = Number(parent.id_dominio_egsi);
              if (idEgsi >= 6 && idEgsi <= 9) egsiIgnoredWeight += weight;
            } else {
              if (isIsoSection) isoSumOfControlScores += score;
              const idEgsi = Number(parent.id_dominio_egsi);
              if (idEgsi >= 6 && idEgsi <= 9) egsiObtainedPoints += score * weight;
            }
          }
        });
      }

      const isoDenominator = 133 - isoIgnoredControlsCount;
      const egsiDenominator = 100 - egsiIgnoredWeight;
      const isoScore = isoDenominator <= 0 ? 0 : Number((isoSumOfControlScores / isoDenominator).toFixed(2));
      const egsiScore = egsiDenominator <= 0 ? 0 : Number((egsiObtainedPoints / egsiDenominator).toFixed(2));
      return { isoScore, egsiScore };
    }

    const scores = calcularPuntajesConsistentes(sections, progressAfter);
    console.log("Calculated Mapped Scores with ALL DB Fixed:", scores);

    // Calculate A5, A6, A7, A8 group scores (using compliance panel logic)
    const allItems = [];
    sections.forEach(sec => {
      const isEgsi = sec.title.includes('EGSI FASE');
      if (!isEgsi) {
        sec.checklist.forEach(item => {
          allItems.push({ ...item, sectionTitle: sec.title });
        });
      }
    });

    const calculateGroupScore = (items) => {
        let totalScore = 0;
        let validItems = 0;
        items.forEach(item => {
            const id = generateId(item.point);
            if (progressAfter.ignored[id]) return;
            validItems++;
            const val = progressAfter.completed[id];
            const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
            const hasLink = !!progressAfter.evidenceLinks[id];
            const partialVal = progressAfter.progresoParcialDecimal?.[id];
            const pValue = partialVal !== undefined && partialVal !== null ? Number(partialVal) : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
            let finalScore = 0.0;
            if (numericVal === 1.0 || numericVal === 0.5) {
                finalScore = hasLink ? pValue : pValue * 0.4;
            }
            totalScore += finalScore;
        });
        return validItems === 0 ? 0 : Math.round((totalScore / validItems) * 100);
    };

    const a5Items = allItems.filter(i => i.sectionTitle.includes('A5'));
    const a6Items = allItems.filter(i => i.sectionTitle.includes('A6'));
    const a7Items = allItems.filter(i => i.sectionTitle.includes('A7'));
    const a8Items = allItems.filter(i => i.sectionTitle.includes('A8'));

    console.log(`A5 Score: ${calculateGroupScore(a5Items)}% (count: ${a5Items.length})`);
    console.log(`A6 Score: ${calculateGroupScore(a6Items)}% (count: ${a6Items.length})`);
    console.log(`A7 Score: ${calculateGroupScore(a7Items)}% (count: ${a7Items.length})`);
    console.log(`A8 Score: ${calculateGroupScore(a8Items)}% (count: ${a8Items.length})`);

    // FORCE ROLLBACK
    throw new Error("ROLLBACK");
  })();
} catch (e) {
  if (e.message !== "ROLLBACK") console.error(e);
}
reportsDb.close();
cmDb.close();
