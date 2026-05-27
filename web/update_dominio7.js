const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath);

const rawData = `7 - CONTROLES FÍSICOS		
7.1		¿Se definen y utilizan perímetros de seguridad para proteger las áreas que contienen información y otros activos asociados?
7.2		¿Las áreas seguras están protegidas por controles de entrada y puntos de acceso adecuados?
7.3		¿Se diseña e implementa la seguridad física de oficinas, salas e instalaciones?
7.4		¿Se supervisan continuamente las instalaciones para evitar el acceso físico no autorizado?
7.5		¿Se diseña e implementa la protección contra amenazas físicas y ambientales, como desastres naturales y otras amenazas físicas, intencionales o no, a la infraestructura?
7.6		¿Se diseñan e implementan medidas de seguridad para trabajar en áreas seguras?
7.7		¿Se definen y aplican adecuadamente normas de seguridad para el escritorio y los medios de almacenamiento extraíbles, así como normas de seguridad para las instalaciones de procesamiento de información?
7.8		¿Los equipos están ubicados de forma segura y protegida?
7.9		¿Están protegidos los activos fuera de las instalaciones?
7.10		¿Se gestionan los medios de almacenamiento a lo largo de su ciclo de vida (adquisición, uso, transporte y eliminación) de acuerdo con el esquema de clasificación y los requisitos de manejo de la organización?
7.11		¿Las instalaciones de procesamiento de información están protegidas contra cortes de energía y otras interrupciones causadas por fallas en los servicios públicos?
7.12		¿Los cables que transportan energía, datos o servicios de información de apoyo están protegidos contra interceptaciones, interferencias o daños?
7.13		¿Se realiza un mantenimiento adecuado de los equipos para garantizar la disponibilidad, integridad y confidencialidad de la información? 
7.14		¿Se verifican los equipos que contienen medios de almacenamiento para garantizar que todos los datos confidenciales y el software con licencia se hayan eliminado o sobrescrito de forma segura antes de su eliminación o reutilización?`;

const lines = rawData.split('\n').filter(l => l.trim() !== '');

const parsedItems = lines.map(line => {
    // Only process lines starting with "7."
    if (!line.trim().startsWith('7.')) return null;

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
  db.prepare("DELETE FROM preguntas WHERE id_norma LIKE '7.%'").run();

  const stmt = db.prepare(`
    INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.id_norma, "Dominio 7: Físico", "Control Físico", "2022", item.pregunta, 1);
    }
  });

  insertMany(parsedItems);
  
  const count = db.prepare("SELECT COUNT(*) as c FROM preguntas WHERE id_norma LIKE '7.%'").get().c;
  console.log("Successfully replaced Dominio 7 items. Total count:", count);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}
