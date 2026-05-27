const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const cmDb = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'), { readonly: true });
const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const targetReport = reportsDb.prepare("SELECT * FROM reports WHERE id = 202").get();
const parsedReport = JSON.parse(targetReport.data);

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));

function translateKeys(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') return parsedData;
  const result = { ...parsedData };
  const mapRecord = (record) => {
    if (!record || typeof record !== 'object') return record;
    const newRecord = {};
    for (const key of Object.keys(record)) {
      const mappedKey = mapping[key] || key;
      newRecord[mappedKey] = record[key];
    }
    return newRecord;
  };
  if (result.checkedItems) result.checkedItems = mapRecord(result.checkedItems);
  if (result.progresoParcialDecimal) result.progresoParcialDecimal = mapRecord(result.progresoParcialDecimal);
  if (result.ignoredItems) result.ignoredItems = mapRecord(result.ignoredItems);
  if (result.evidenceLinks) result.evidenceLinks = mapRecord(result.evidenceLinks);
  if (result.justifications) result.justifications = mapRecord(result.justifications);
  return result;
}

const generateId = (title) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

const rows = cmDb.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all();

const allItems = rows.map(row => {
  let dom = row.dominio;
  if (!dom || dom === 'Dominio General' || dom.trim() === '') {
    const id_norma = (row.id_norma || '').toString();
    if (id_norma.startsWith('5.')) {
      dom = 'Dominio 5: Organizacional';
    } else if (id_norma.startsWith('6.')) {
      dom = 'Dominio 6: Personas';
    } else if (id_norma.startsWith('7.')) {
      dom = 'Dominio 7: Físico';
    } else if (id_norma.startsWith('8.')) {
      dom = 'Dominio 8: Tecnológico';
    } else {
      dom = 'Cláusulas ISO 27001';
    }
  }
  return {
    point: row.pregunta,
    id_norma: row.id_norma,
    id_dominio_egsi: row.id_dominio_egsi,
    peso_gpr: row.peso_gpr,
    sectionTitle: dom
  };
});

function calculateScore(items, progress) {
  let totalScore = 0;
  let validItems = 0;
  const isFase2 = items.length > 0 && Number(items[0].id_dominio_egsi) === 7;

  items.forEach(item => {
    const id = generateId(item.point);
    if (progress.ignored[id] && !isFase2) return;
    validItems++;

    const val = progress.completed[id];
    const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
    const hasLink = !!progress.evidenceLinks[id];

    const partialVal = progress.progresoParcialDecimal?.[id];
    const pValue = partialVal !== undefined && partialVal !== null
      ? Number(partialVal)
      : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

    let finalScore = 0.0;
    if (numericVal === 1.0 || numericVal === 0.5) {
      finalScore = hasLink ? pValue : pValue * 0.4;
    }
    totalScore += finalScore;
  });

  if (isFase2) {
    return Math.round((totalScore / 133) * 100);
  }
  if (validItems === 0) return 0;
  return Math.round((totalScore / validItems) * 100);
}

// Translate keys
const translatedProgress = translateKeys(parsedReport);
const progress = {
  completed: translatedProgress.checkedItems || translatedProgress || {},
  ignored: translatedProgress.ignoredItems || {},
  evidenceLinks: translatedProgress.evidenceLinks || {},
  progresoParcialDecimal: translatedProgress.progresoParcialDecimal || {}
};

const isoGroups = [
  'A5: Controles Organizacionales',
  'A6: Controles Personales',
  'A7: Controles Físico',
  'A8: Controles Tecnologicos',
  'Cláusulas ISO 27001'
];

isoGroups.forEach(dom => {
  const items = allItems.filter(i => i.sectionTitle === dom || i.sectionTitle.includes(dom));
  const score = calculateScore(items, progress);
  console.log(`${dom}: ${score}% (Item count: ${items.length})`);
});

cmDb.close();
reportsDb.close();
