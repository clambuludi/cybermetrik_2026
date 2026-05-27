const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const cmDb = new Database(path.resolve(__dirname, '..', '..', 'instance', 'cybermetrik.db'));
const reportsDb = new Database(path.resolve(__dirname, '..', 'reports.db'), { readonly: true });

const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
const parsedBefore = JSON.parse(targetReport.data);

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

function getScoresForProgress(sections, progress) {
  let isoSumOfControlScores = 0;
  let isoIgnoredControlsCount = 0;
  let egsiObtainedPoints = 0;
  let egsiIgnoredWeight = 0;
  const parentScores = {};

  const getSingleItemScoreWithLink = (item) => {
    const itemId = generateId(item.point);
    if (progress.ignored[itemId]) return 0;
    const val = progress.completed[itemId];
    const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
    const partialVal = progress.progresoParcialDecimal?.[itemId];
    const pValue = partialVal !== undefined && partialVal !== null ? Number(partialVal) : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
    const hasLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';
    if (numericVal === 1.0 || numericVal === 0.5) {
      return hasLink ? pValue : pValue * 0.4;
    }
    return 0;
  };

  for (const section of sections) {
    if (!section?.checklist) continue;
    const isIsoSection = !section.title.includes('EGSI FASE');
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
          if (isIsoSection) {
            isoSumOfControlScores += parentScore;
            parentScores[parentIdNorma] = parentScore;
          }
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            const weight = Number(children[0].peso_gpr) || 0;
            egsiObtainedPoints += parentScore * weight;
          }
        } else {
          if (isIsoSection) {
            isoIgnoredControlsCount++;
            parentScores[parentIdNorma] = 'IGNORED';
          }
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
          if (isIsoSection) {
            isoIgnoredControlsCount++;
            parentScores[parentIdNorma] = 'IGNORED';
          }
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) egsiIgnoredWeight += weight;
        } else {
          if (isIsoSection) {
            isoSumOfControlScores += score;
            parentScores[parentIdNorma] = score;
          }
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) egsiObtainedPoints += score * weight;
        }
      }
    });
  }

  // Calculate A5, A6 group scores using the same logic as dashboard-compliance.tsx
  const allItems = [];
  sections.forEach(sec => {
    if (!sec.title.includes('EGSI FASE')) {
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
      if (progress.ignored[id]) return;
      validItems++;
      totalScore += getSingleItemScoreWithLink(item);
    });
    return validItems === 0 ? 0 : Math.round((totalScore / validItems) * 100);
  };

  const a5Items = allItems.filter(i => i.sectionTitle.includes('A5') || i.sectionTitle.includes('Organizacional'));
  const a6Items = allItems.filter(i => i.sectionTitle.includes('A6') || i.sectionTitle.includes('Personas'));

  const a5Score = calculateGroupScore(a5Items);
  const a6Score = calculateGroupScore(a6Items);

  const isoDenominator = 133 - isoIgnoredControlsCount;
  const egsiDenominator = 100 - egsiIgnoredWeight;
  const isoScore = isoDenominator <= 0 ? 0 : Number((isoSumOfControlScores / isoDenominator).toFixed(2));
  const egsiScore = egsiDenominator <= 0 ? 0 : Number((egsiObtainedPoints / egsiDenominator).toFixed(2));
  return { isoScore, egsiScore, isoSumOfControlScores, isoDenominator, parentScores, a5Score, a6Score };
}

try {
  cmDb.transaction(() => {
    // STATE 1: CURRENT CODEBASE (Before fixes, static slug map)
    const rowsBefore = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
    const groupedBefore = rowsBefore.reduce((acc, row) => {
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
      acc[dom].push({ point: row.pregunta, id_norma: row.id_norma, id_dominio_egsi: row.id_dominio_egsi, peso_gpr: row.peso_gpr });
      return acc;
    }, {});
    const sectionsBefore = Object.entries(groupedBefore).map(([title, checklist]) => ({ title, checklist }));

    const mappingBefore = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));
    const translateBefore = (data) => {
      const result = { ...data };
      const mapRec = (rec) => {
        if (!rec || typeof rec !== 'object') return rec;
        const newRec = {};
        for (const k of Object.keys(rec)) { newRec[mappingBefore[k] || k] = rec[k]; }
        return newRec;
      };
      if (result.checkedItems) result.checkedItems = mapRec(result.checkedItems);
      if (result.progresoParcialDecimal) result.progresoParcialDecimal = mapRec(result.progresoParcialDecimal);
      if (result.ignoredItems) result.ignoredItems = mapRec(result.ignoredItems);
      if (result.evidenceLinks) result.evidenceLinks = mapRec(result.evidenceLinks);
      return result;
    };
    const progressBefore = translateBefore(parsedBefore);
    const completedBefore = progressBefore.checkedItems || progressBefore || {};
    const ignoredBefore = progressBefore.ignoredItems || {};
    const progresoParcialDecimalBefore = progressBefore.progresoParcialDecimal || {};
    const evidenceLinksBefore = progressBefore.evidenceLinks || {};
    const state1 = getScoresForProgress(sectionsBefore, { 
      completed: completedBefore, 
      ignored: ignoredBefore, 
      progresoParcialDecimal: progresoParcialDecimalBefore,
      evidenceLinks: evidenceLinksBefore
    });

    // STATE 2: FIXED CODEBASE (Apply all updates, dynamic slug map)
    cmDb.prepare("UPDATE preguntas SET pregunta = 'Segregación de tareas, documentado e implementado' WHERE id_norma = 'A.5.3'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = 'Contacto con grupos de interés especial, documentado e implementado' WHERE id_norma = 'A.5.6'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = '¿La organización toma medidas contra el personal y otras partes interesadas pertinentes que han cometido una infracción de la política de seguridad de la información?' WHERE id_norma = 'A.6.4.b'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = '¿Se supervisan y revisan las configuraciones, incluidas las de seguridad, de hardware, software, servicios y redes?' WHERE id_norma = 'A.8.9.b'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = '¿La organización supervisa las redes, los sistemas y las aplicaciones para detectar comportamientos anómalos y evaluar posibles incidentes de seguridad de la información?' WHERE id_norma = 'A.8.16.a'").run();
    cmDb.prepare("UPDATE preguntas SET pregunta = 'Contacto con las autoridades, documentado e implementado' WHERE id_norma = 'A.5.5'").run();

    const rowsAfter = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();
    const currentSlugsMap = {};
    rowsAfter.forEach(q => { currentSlugsMap[q.id_norma] = generateId(q.pregunta); });

    const tempCatalog = {};
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
            else if (char === ',' && !insideQuotes) { fields.push(currentField.trim()); currentField = ''; }
            else { currentField += char; }
        }
        fields.push(currentField.trim());
        if (fields.length >= 5) { tempCatalog[generateId(fields[4])] = fields[1]; }
    }

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

    const oldSlugToNewSlugMap = {};
    const oldSlugs = Object.keys(parsedBefore.checkedItems || parsedBefore);
    oldSlugs.forEach(slug => {
        let norma = oldSlugToNorma[slug] || tempCatalog[slug];
        if (!norma) {
            const clean = slug.replace(/^-+|-+$/g, '');
            norma = oldSlugToNorma[clean] || tempCatalog[clean];
        }
        if (norma) {
            let newSlug = currentSlugsMap[norma];
            if (newSlug) { oldSlugToNewSlugMap[slug] = newSlug; }
        }
    });

    const groupedAfter = rowsAfter.reduce((acc, row) => {
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
      acc[dom].push({ point: row.pregunta, id_norma: row.id_norma, id_dominio_egsi: row.id_dominio_egsi, peso_gpr: row.peso_gpr });
      return acc;
    }, {});
    const sectionsAfter = Object.entries(groupedAfter).map(([title, checklist]) => ({ title, checklist }));

    const translateAfter = (data) => {
      const result = { ...data };
      const mapRec = (rec) => {
        if (!rec || typeof rec !== 'object') return rec;
        const newRec = {};
        for (const k of Object.keys(rec)) { newRec[oldSlugToNewSlugMap[k] || k] = rec[k]; }
        return newRec;
      };
      if (result.checkedItems) result.checkedItems = mapRec(result.checkedItems);
      if (result.progresoParcialDecimal) result.progresoParcialDecimal = mapRec(result.progresoParcialDecimal);
      if (result.ignoredItems) result.ignoredItems = mapRec(result.ignoredItems);
      if (result.evidenceLinks) result.evidenceLinks = mapRec(result.evidenceLinks);
      return result;
    };
    const progressAfter = translateAfter(parsedBefore);
    const completedAfter = progressAfter.checkedItems || progressAfter || {};
    const ignoredAfter = progressAfter.ignoredItems || {};
    const progresoParcialDecimalAfter = progressAfter.progresoParcialDecimal || {};
    const evidenceLinksAfter = progressAfter.evidenceLinks || {};
    const state2 = getScoresForProgress(sectionsAfter, { 
      completed: completedAfter, 
      ignored: ignoredAfter, 
      progresoParcialDecimal: progresoParcialDecimalAfter,
      evidenceLinks: evidenceLinksAfter
    });

    console.log("=== COMPARING SCORES ===");
    console.log("State 1 (Static Map): ISO:", state1.isoScore, "EGSI:", state1.egsiScore, "A5:", state1.a5Score, "A6:", state1.a6Score);
    console.log("State 2 (Fixed DB):   ISO:", state2.isoScore, "EGSI:", state2.egsiScore, "A5:", state2.a5Score, "A6:", state2.a6Score);

    console.log("\n=== COMPARING PARENT CONTROLS ===");
    const allNormas = new Set([...Object.keys(state1.parentScores), ...Object.keys(state2.parentScores)]);
    const sortedNormas = Array.from(allNormas).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    let differencesFound = 0;
    for (const norma of sortedNormas) {
      const v1 = state1.parentScores[norma];
      const v2 = state2.parentScores[norma];
      if (v1 !== v2) {
        differencesFound++;
        console.log(`[${norma}] State 1: ${v1} | State 2: ${v2}`);
      }
    }
    if (differencesFound === 0) {
      console.log("No differences found in parent control scores!");
    } else {
      console.log(`Found ${differencesFound} differences!`);
    }

    throw new Error("ROLLBACK");
  })();
} catch (e) {
  if (e.message !== "ROLLBACK") console.error(e);
}
reportsDb.close();
cmDb.close();
