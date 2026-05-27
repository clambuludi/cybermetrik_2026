const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../../instance/cybermetrik.db'));
const rows = db.prepare("SELECT id, id_norma, dominio, id_dominio_egsi, peso_gpr, pregunta FROM preguntas WHERE activo = 1").all();

const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

// 1. Group checklist items by parent/flat structure
// For each section/domain, we want to construct a list of "evaluable macro controls"
const sections = {};
rows.forEach(r => {
  const dom = r.dominio || 'General';
  if (!sections[dom]) sections[dom] = [];
  sections[dom].push(r);
});

// Now let's calculate for each section
for (const [dom, items] of Object.entries(sections)) {
  const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
  
  // Find all children
  const childrenMap = {};
  const parentRows = [];
  const childRows = [];
  
  items.forEach(item => {
    const match = item.id_norma.trim().match(SUB_ITEM_REGEX);
    if (match) {
      const parentId = match[1];
      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      childrenMap[parentId].push(item);
      childRows.push(item);
    } else {
      parentRows.push(item);
    }
  });
  
  // Now build the macro controls list
  const macroControls = [];
  parentRows.forEach(parent => {
    const parentId = parent.id_norma.trim();
    const children = childrenMap[parentId] || [];
    
    // Weight logic: if parent has children, weight is the child weight, else parent weight
    let weight = 0;
    if (children.length > 0) {
      weight = Number(children[0].peso_gpr) || 0;
    } else {
      weight = Number(parent.peso_gpr) || 0;
    }
    
    macroControls.push({
      id_norma: parentId,
      pregunta: parent.pregunta,
      weight: weight,
      children: children,
      isParent: children.length > 0,
      id_dominio_egsi: parent.id_dominio_egsi
    });
  });
  
  console.log(`Domain: "${dom}"`);
  console.log(`  Macro controls: ${macroControls.length}`);
  console.log(`  Sum of GPR weights: ${macroControls.reduce((acc, c) => acc + c.weight, 0).toFixed(2)}`);
}

db.close();
