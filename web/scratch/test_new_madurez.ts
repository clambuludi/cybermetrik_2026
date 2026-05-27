import { calcularPuntajesConsistentes } from '../src/utils/madurez';
import Database from 'better-sqlite3';
import path from 'path';

const cmDbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
const reportsDbPath = path.resolve(__dirname, '../reports.db');

const cmDb = new Database(cmDbPath, { readonly: true });
const reportsDb = new Database(reportsDbPath, { readonly: true });

// Load active questions
const rows = cmDb.prepare("SELECT id, id_norma, dominio, pregunta, peso_gpr, id_dominio_egsi FROM preguntas WHERE activo = 1").all() as any[];
cmDb.close();

// Group into sections
const grouped = rows.reduce((acc, row) => {
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
  if (!acc[dom]) acc[dom] = [];
  acc[dom].push({
    point: row.pregunta,
    id_norma: row.id_norma,
    id_dominio_egsi: row.id_dominio_egsi,
    peso_gpr: row.peso_gpr,
  });
  return acc;
}, {} as Record<string, any[]>);

const sections: any[] = [];
for (const [dom, items] of Object.entries(grouped)) {
  sections.push({
    title: dom,
    checklist: items
  });
}

// Load report 208
const report = reportsDb.prepare("SELECT * FROM reports WHERE id = 208").get() as any;
reportsDb.close();

const reportData = JSON.parse(report.data);
const progress = {
    completed: reportData.checkedItems || {},
    ignored: reportData.ignoredItems || {},
    evidenceLinks: reportData.evidenceLinks || {},
    progresoParcialDecimal: reportData.progresoParcialDecimal || {}
};

if (report.progreso_parcial_decimal) {
    const dbParcial = JSON.parse(report.progreso_parcial_decimal);
    progress.progresoParcialDecimal = { ...progress.progresoParcialDecimal, ...dbParcial };
}

const scores = calcularPuntajesConsistentes(sections, progress);
console.log("=== VERIFYING NEW SCORES ===");
console.log(scores);
console.log("============================");
