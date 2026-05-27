const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath);

const rawData = `6.1a		¿Se realizan verificaciones de antecedentes antes de que el personal se incorpore a la organización?
6.1b		¿Se realizan verificaciones de antecedentes de forma continua para tener en cuenta las leyes, regulaciones y ética aplicables?
6.1c		¿Son las verificaciones de antecedentes proporcionales a los requisitos del negocio, la clasificación de la información a la que se accede y los riesgos percibidos?
6.2		¿Los contratos de trabajo establecen las responsabilidades del personal y de la organización en materia de seguridad de la información?
6.3a		¿El personal y las partes interesadas pertinentes reciben la formación, la capacitación y la concienciación adecuadas en seguridad de la información?
6.3b		¿El personal y las partes interesadas pertinentes reciben actualizaciones periódicas de la política de seguridad de la información de la organización, las políticas y los procedimientos específicos para cada tema, según corresponda a su función laboral?
6.4a		¿La organización cuenta con una política disciplinaria formalizada?
6.4b		¿La organización toma medidas contra el personal y otras partes interesadas pertinentes que han cometido una infracción de la política de seguridad de la información?
6.5		¿Se han definido, aplicado y comunicado al personal pertinente y a otras partes interesadas las responsabilidades y obligaciones en materia de seguridad de la información que siguen vigentes tras la rescisión o el cambio de empleo?
6.6a		¿Se han identificado y documentado los acuerdos de confidencialidad o no divulgación que reflejan las necesidades de la organización en materia de protección de la información?
6.6b		 ¿Se revisan periódicamente los acuerdos de confidencialidad o no divulgación?
6.6c		¿El personal y otras partes interesadas pertinentes firman los acuerdos de confidencialidad o no divulgación?
6.7a		¿Se han implementado medidas de seguridad para el personal que trabaja a distancia?
6.7b		¿Las medidas de seguridad del teletrabajo protegen adecuadamente la información a la que se accede, procesa o almacena fuera de las instalaciones de la organización?
6.8		¿Ha establecido la organización un mecanismo para informar oportunamente sobre eventos de seguridad de la información observados o sospechosos a través de los canales adecuados?`;

const lines = rawData.split('\n').filter(l => l.trim() !== '');

const parsedItems = lines.map(line => {
    // Split by whitespace/tabs to separate the ID from the text
    const match = line.match(/^([^\s]+)\s+(.*)$/);
    if (!match) return null;
    
    const id = match[1].trim();
    let text = match[2].trim();
    
    // Remove quotes if present
    if (text.startsWith('"')) text = text.substring(1);
    if (text.endsWith('"')) text = text.substring(0, text.length - 1);
    text = text.trim();

    return {
        id_norma: id,
        pregunta: text
    };
}).filter(i => i !== null);

try {
  // First, delete old ones
  db.prepare("DELETE FROM preguntas WHERE id_norma LIKE '6.%'").run();

  const stmt = db.prepare(`
    INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.id_norma, "Dominio 6: Personas", "Control de Personas", "2022", item.pregunta, 1);
    }
  });

  insertMany(parsedItems);
  
  const count = db.prepare("SELECT COUNT(*) as c FROM preguntas WHERE id_norma LIKE '6.%'").get().c;
  console.log("Successfully replaced Dominio 6 items. Total count:", count);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}
