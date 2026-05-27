const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'instance/cybermetrik.db');
const db = new Database(dbPath);

const clausulasISO = [
  { id: "ISO-4.1", componente: "Contexto de la organización", pregunta: "¿Se han determinado las cuestiones internas y externas? (Fila 19)" },
  { id: "ISO-4.2", componente: "Partes interesadas", pregunta: "¿Se conocen las partes interesadas y sus requisitos? (Fila 20)" },
  { id: "ISO-4.3", componente: "Alcance del SGSI", pregunta: "¿Está definido el alcance formal del SGSI? (Fila 21)" },
  { id: "ISO-4.4", componente: "Sistema de Gestión", pregunta: "¿Se opera y mantiene el SGSI conforme a la norma? (Fila 22 en catálogo)" },
  { id: "ISO-5.1", componente: "Liderazgo corporativo", pregunta: "¿La alta dirección demuestra liderazgo con la seguridad? (Fila 22 en cuestionario)" },
  { id: "ISO-5.2", componente: "Política de Seguridad", pregunta: "¿Existe una Política de Seguridad formal aprobada? (Fila 23)" },
  { id: "ISO-5.3", componente: "Roles y Responsabilidades", pregunta: "¿Se han asignado y comunicado los roles del SGSI? (Fila 24)" },
  { id: "ISO-6.1a", componente: "Evaluación de Riesgos", pregunta: "¿Se aplica un proceso de evaluación de riesgos? (Fila 25)" },
  { id: "ISO-6.1b", componente: "Evaluación de Riesgos", pregunta: "¿Las evaluaciones de riesgos producen resultados consistentes? (Fila 26)" },
  { id: "ISO-6.1c", componente: "Evaluación de Riesgos", pregunta: "¿Se identifican los riesgos sobre CID y sus dueños? (Fila 27)" },
  { id: "ISO-6.1d", componente: "Evaluación de Riesgos", pregunta: "¿Se evalúan las consecuencias y probabilidades del riesgo? (Fila 28)" },
  { id: "ISO-6.1e", componente: "Evaluación de Riesgos", pregunta: "¿Se priorizan los riesgos según los criterios de la empresa? (Fila 29)" },
  { id: "ISO-6.1f", componente: "Evaluación de Riesgos", pregunta: "¿Se conserva información documentada de los riesgos? (Fila 30)" },
  { id: "ISO-6.1g", componente: "Tratamiento de Riesgos", pregunta: "¿Se aplica un proceso de tratamiento de riesgos? (Fila 31)" },
  { id: "ISO-6.1h", componente: "Tratamiento de Riesgos", pregunta: "¿Se determinan todos los controles necesarios para mitigar? (Fila 32)" },
  { id: "ISO-6.1i", componente: "Tratamiento de Riesgos", pregunta: "¿Se compararon los controles con el Anexo A de la norma? (Fila 33)" },
  { id: "ISO-6.1j", componente: "Tratamiento de Riesgos", pregunta: "¿Se ha elaborado la Declaración de Aplicabilidad (SoA)? (Fila 34)" },
  { id: "ISO-6.1k", componente: "Tratamiento de Riesgos", pregunta: "¿El Plan de Tratamiento cuenta con aprobación de los dueños? (Fila 35)" },
  { id: "ISO-6.1l", componente: "Tratamiento de Riesgos", pregunta: "¿Se guarda evidencia documentada del tratamiento de riesgos? (Fila 36)" },
  { id: "ISO-6.2a", componente: "Objetivos de Seguridad", pregunta: "¿Se han establecido objetivos de seguridad de la información? (Fila 37)" },
  { id: "ISO-6.2b", componente: "Objetivos de Seguridad", pregunta: "¿Los objetivos son medibles, coherentes y actualizados? (Fila 38)" },
  { id: "ISO-6.2c", componente: "Objetivos de Seguridad", pregunta: "¿Se conserva evidencia documentada de los objetivos? (Fila 39)" },
  { id: "ISO-6.2d", componente: "Objetivos de Seguridad", pregunta: "¿Se planificó el cómo, quién, cuándo y recursos para las metas? (Fila 40)" },
  { id: "ISO-6.3", componente: "Planificación de Cambios", pregunta: "¿Los cambios en el SGSI se realizan de forma planificada? (Fila 41)" },
  { id: "ISO-7.1", componente: "Soporte y Recursos", pregunta: "¿Se proporcionan los recursos necesarios para el SGSI? (Fila 42)" },
  { id: "ISO-7.2a", componente: "Competencias del Personal", pregunta: "¿Se ha determinado la competencia necesaria del personal? (Fila 43)" },
  { id: "ISO-7.2b", componente: "Competencias del Personal", pregunta: "¿Se toman acciones para capacitar al personal no competente? (Fila 44)" },
  { id: "ISO-7.2c", componente: "Competencias del Personal", pregunta: "¿Se guardan los respaldos/evidencias de las competencias? (Fila 45)" },
  { id: "ISO-7.3", componente: "Concienciación", pregunta: "¿El personal está concienciado con la Política y el SGSI? (Fila 46)" }
];

try {
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
  console.log("Cláusulas insertadas con éxito!");
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}
