const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));

const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });
const r202 = reportsDb.prepare("SELECT data FROM reports WHERE id = 202").get().data;
const r206 = reportsDb.prepare("SELECT data FROM reports WHERE id = 206").get().data;
reportsDb.close();

const translateKeys = (parsedData) => {
  if (!parsedData || typeof parsedData !== 'object') return parsedData;
  const result = { ...parsedData };
  const mapRecord = (record) => {
    if (!rec || typeof rec !== 'object') return rec;
    const newRecord = {};
    for (const key of Object.keys(record)) {
      const mappedKey = mapping[key] || key;
      newRecord[mappedKey] = record[key];
    }
    return newRecord;
  };
  const rec = (x) => {
    if (!x || typeof x !== 'object') return x;
    const r = {};
    for (const k of Object.keys(x)) { r[mapping[k] || k] = x[k]; }
    return r;
  };
  if (result.checkedItems) result.checkedItems = rec(result.checkedItems);
  if (result.progresoParcialDecimal) result.progresoParcialDecimal = rec(result.progresoParcialDecimal);
  if (result.ignoredItems) result.ignoredItems = rec(result.ignoredItems);
  if (result.evidenceLinks) result.evidenceLinks = rec(result.evidenceLinks);
  return result;
};

const d202Before = JSON.parse(r202);
const d202Translated = translateKeys(d202Before);
const d206 = JSON.parse(r206);

const c202 = d202Translated.checkedItems || {};
const c206 = d206.checkedItems || {};

console.log("=== COMPARING COMPLETED KEYS ===");
console.log(`202 translated count: ${Object.keys(c202).length}`);
console.log(`206 count:            ${Object.keys(c206).length}`);

const allKeys = new Set([...Object.keys(c202), ...Object.keys(c206)]);
for (const k of allKeys) {
  const v202 = c202[k];
  const v206 = c206[k];
  if (v202 !== v206) {
    console.log(`Key: "${k}"\n  -> Report 202 (Translated): ${v202}\n  -> Report 206 (Current):    ${v206}`);
  }
}
