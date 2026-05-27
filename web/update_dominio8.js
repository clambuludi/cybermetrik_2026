const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath);

const rawData = `8 - TECHNOLOGICAL CONTROLS		
8.1		¿Está protegida la información almacenada, procesada o accesible a través de los dispositivos de usuario?
8.2		¿Se restringe y gestiona la asignación y el uso de derechos de acceso privilegiado?
8.3		¿Se restringe el acceso a la información y otros activos asociados de acuerdo con la política específica de control de acceso establecida?
8.4		¿Se gestiona adecuadamente el acceso de lectura y escritura al código fuente, las herramientas de desarrollo y las bibliotecas de software?
8.5		¿Ha implementado la organización tecnologías y procedimientos de autenticación seguros basados en las restricciones de acceso a la información y la política específica de control de acceso?
8.6		¿Se supervisa y ajusta el uso de los recursos según los requisitos de capacidad actuales y previstos?
8.7a		¿Ha implementado la organización protección contra malware?
8.7b		¿El enfoque de la organización para la protección contra malware se sustenta en una adecuada concienciación de los usuarios?
8.8a		¿Se obtiene información sobre las vulnerabilidades técnicas de los sistemas de información en uso?
8.8b		¿Evalúa la organización su exposición a vulnerabilidades técnicas y toma las medidas adecuadas?
8.9a		¿Se han establecido, documentado e implementado las configuraciones, incluidas las de seguridad, de hardware, software, servicios y redes?
8.9b		¿Se supervisan y revisan las configuraciones, incluidas las de seguridad, de hardware, software, servicios y redes? 
8.10		¿Se elimina la información almacenada en sistemas de información, dispositivos o cualquier otro medio de almacenamiento cuando ya no se necesita?
8.11		¿Se utiliza el enmascaramiento de datos de acuerdo con la política específica de la organización sobre control de acceso y otras políticas relacionadas, así como con los requisitos del negocio, teniendo en cuenta la legislación aplicable?
8.12		¿Se aplican medidas de prevención de fugas de datos a los sistemas, redes y cualquier otro dispositivo que procese, almacene o transmita información confidencial?
8.13		¿Se mantienen y prueban periódicamente copias de seguridad de la información, el software y los sistemas, de acuerdo con la política específica acordada sobre copias de seguridad?
8.14		¿Se implementan en los recursos de tratamiento de la información la redundancia suficiente para cumplir con los requisitos de disponibilidad?
8.15		¿Se generan, almacenan, protegen y analizan los registros que registran actividades, excepciones, fallos y otros eventos relevantes?
8.16a		¿La organización supervisa las redes, los sistemas y las aplicaciones para detectar comportamientos anómalos y evaluar posibles incidentes de seguridad de la información?
8.16b		¿La organización toma las medidas adecuadas cuando se identifican incidentes de seguridad de la información?
8.17		¿Están sincronizados los relojes de los sistemas de procesamiento de información utilizados por la organización con las fuentes de tiempo aprobadas?
8.18		¿Está restringido y estrictamente controlado el uso de programas de utilidad capaces de anular los controles del sistema y de las aplicaciones?
8.19		 ¿Ha implementado la organización procedimientos y medidas para gestionar de forma segura la instalación de software en los sistemas operativos?
8.20		¿Se protegen, gestionan y controlan las redes y los dispositivos de red para proteger la información de los sistemas y las aplicaciones?
8.21		¿Se identifican, implementan y supervisan los mecanismos de seguridad, los niveles de servicio y los requisitos de servicio de los servicios de red?
8.22		¿Se separa la organización de los grupos de servicios de información, usuarios y sistemas de información en las redes de la organización?
8.23		¿Se gestiona el acceso a sitios web externos para reducir la exposición a contenido malicioso?
8.24		¿Se definen e implementan las normas para el uso eficaz de la criptografía, incluida la gestión de claves criptográficas?
8.25		¿Ha establecido y aplicado la organización normas para el desarrollo seguro de software y sistemas?
8.26		¿Se identifican, especifican y aprueban los requisitos de seguridad de la información al desarrollar o adquirir aplicaciones?
8.27		¿Se establecen, documentan, mantienen y aplican los principios de ingeniería de sistemas seguros en las actividades de desarrollo de sistemas de información?
8.28		¿Aplica la organización principios de codificación segura al desarrollo de software?
8.29		¿Se definen e implementan procesos de pruebas de seguridad durante el ciclo de vida del desarrollo?
8.30		¿Dirige, supervisa y revisa la organización las actividades relacionadas con el desarrollo de sistemas externalizados?
8.31		¿Están separados y protegidos los entornos de desarrollo, prueba y producción?
8.32		 ¿Están los cambios en las instalaciones y sistemas de procesamiento de información sujetos a procedimientos de gestión de cambios?
8.33		¿Se selecciona, protege y gestiona adecuadamente la información de las pruebas?
8.34		¿Se planifican y acuerdan las pruebas de auditoría y otras actividades de aseguramiento que implican la evaluación de los sistemas operativos entre el responsable de las pruebas y la dirección correspondiente?`;

const lines = rawData.split('\n').filter(l => l.trim() !== '');

const parsedItems = lines.map(line => {
    // Only process lines starting with "8."
    if (!line.trim().startsWith('8.')) return null;

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
  db.prepare("DELETE FROM preguntas WHERE id_norma LIKE '8.%'").run();

  const stmt = db.prepare(`
    INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.id_norma, "Dominio 8: Tecnológico", "Control Tecnológico", "2022", item.pregunta, 1);
    }
  });

  insertMany(parsedItems);
  
  const count = db.prepare("SELECT COUNT(*) as c FROM preguntas WHERE id_norma LIKE '8.%'").get().c;
  console.log("Successfully replaced Dominio 8 items. Total count:", count);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}
