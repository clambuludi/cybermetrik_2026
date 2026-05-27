const Database = require('better-sqlite3');
const path = require('path');

const rDb = new Database(path.resolve(__dirname, '../reports.db'), { readonly: true });

const reports = rDb.prepare("SELECT * FROM reports WHERE user_id = 57").all();

reports.forEach(r => {
  console.log(`\nReport ID: ${r.id} | score: ${r.score} | finalized: ${r.is_finalized} | date: ${r.created_at}`);
  const parsed = JSON.parse(r.data);
  console.log("Parsed scores in JSON data:", {
    isoScore: parsed.isoScore,
    egsiScore: parsed.egsiScore,
    clausesScore: parsed.clausesScore
  });
});

rDb.close();
