const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/utils/slug-mapping-data.json'), 'utf8'));

const reportsDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });
const r202 = reportsDb.prepare("SELECT data FROM reports WHERE id = 202").get().data;
reportsDb.close();

const parsed = JSON.parse(r202);
const checkedItems = parsed.checkedItems || parsed || {};

const mappedToOldKeys = {};
for (const oldKey of Object.keys(checkedItems)) {
  const newKey = mapping[oldKey] || oldKey;
  if (!mappedToOldKeys[newKey]) {
    mappedToOldKeys[newKey] = [];
  }
  mappedToOldKeys[newKey].push({ oldKey, val: checkedItems[oldKey] });
}

console.log("=== DETECTED COLLISION TARGETS ===");
let collisionsCount = 0;
for (const newKey of Object.keys(mappedToOldKeys)) {
  if (mappedToOldKeys[newKey].length > 1) {
    collisionsCount++;
    console.log(`\nNew Key: "${newKey}"`);
    mappedToOldKeys[newKey].forEach(item => {
      console.log(`  <- Old Key: "${item.oldKey}" (val: ${item.val})`);
    });
  }
}

console.log(`\nTotal collisions: ${collisionsCount}`);
