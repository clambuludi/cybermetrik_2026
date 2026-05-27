const db = require('better-sqlite3')('../instance/cybermetrik.db');

// Disable all fallback records by assigning them to a hidden domain or turning them off
db.prepare("UPDATE preguntas SET activo = 0 WHERE (dominio IS NULL OR dominio = 'Dominio General' OR TRIM(dominio) = '') AND id_norma NOT LIKE '5.%' AND id_norma NOT LIKE '6.%' AND id_norma NOT LIKE '7.%' AND id_norma NOT LIKE '8.%'").run();

// Delete all explicit ISO 27001 records
db.prepare("DELETE FROM preguntas WHERE dominio = 'Cláusulas ISO 27001'").run();

// Re-insert the 12 explicit records
const clausulasISO = [
  { id: "ISO-01", componente: "Contexto de la organización", pregunta: "¿Se han determinado las cuestiones internas y externas? (Fila 19)" },
  { id: "ISO-02", componente: "Partes interesadas", pregunta: "¿Se conocen las partes interesadas y sus requisitos? (Fila 20)" },
  { id: "ISO-03", componente: "Alcance del SGSI", pregunta: "¿Está definido el alcance formal del SGSI? (Fila 21)" },
  { id: "ISO-04", componente: "Sistema de Gestión", pregunta: "¿Se opera y mantiene el SGSI conforme a la norma? (Fila 22)" },
  { id: "ISO-05", componente: "Liderazgo corporativo", pregunta: "¿La alta dirección demuestra liderazgo con la seguridad? (Fila 23)" },
  { id: "ISO-06", componente: "Política de Seguridad", pregunta: "¿Existe una Política de Seguridad formal aprobada? (Fila 24)" },
  { id: "ISO-07", componente: "Roles y Responsabilidades", pregunta: "¿Se han asignado y comunicado los roles del SGSI? (Fila 25)" },
  { id: "ISO-08", componente: "Acciones para Riesgos", pregunta: "¿Se planifican acciones frente a riesgos y oportunidades? (Fila 26)" },
  { id: "ISO-09", componente: "Evaluación de Riesgos", pregunta: "¿Se aplica un proceso formal de evaluación de riesgos? (Fila 27)" },
  { id: "ISO-10", componente: "Tratamiento de Riesgos", pregunta: "¿Se ejecuta un plan para el tratamiento de los riesgos? (Fila 28)" },
  { id: "ISO-11", componente: "Objetivos de Seguridad", pregunta: "¿Se han establecido objetivos de seguridad medibles? (Fila 29)" },
  { id: "ISO-12", componente: "Planificación de Cambios", pregunta: "¿Los cambios en el SGSI se realizan de forma planificada? (Fila 30)" }
];

const stmt = db.prepare(`
  INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo) 
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    stmt.run(item.id, "Cláusulas ISO 27001", item.componente, "2022", item.pregunta, 1);
  }
});

insertMany(clausulasISO);

const finalCount = db.prepare("SELECT COUNT(*) as c FROM preguntas WHERE dominio = 'Cláusulas ISO 27001'").get().c;
console.log("Records under Cláusulas ISO 27001:", finalCount);

db.close();
