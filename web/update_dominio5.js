const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../instance/cybermetrik.db');
const db = new Database(dbPath);

const rawData = `5.1a ¿Se ha definido, aprobado por la dirección y publicado una política de seguridad de la información y políticas temáticas? 
5.1b ¿Se ha comunicado la política de seguridad de la información y las políticas temáticas al personal pertinente y a las partes interesadas, y estas las han reconocido? 
5.1c ¿Se revisan la política de seguridad de la información y las políticas temáticas a intervalos planificados y en caso de cambios significativos? 
5.2 " ¿Se han definido y asignado los roles y responsabilidades de seguridad de la información según las necesidades de la organización?" 
5.3 " ¿Se han segregado las funciones y áreas de responsabilidad en conflicto?" 
5.4 ¿Se asegura la dirección de que todo el personal aplique la seguridad de la información de acuerdo con la política de seguridad de la información, las políticas temáticas y los procedimientos establecidos de la organización? 
5.5 ¿Mantiene la organización contacto con las autoridades pertinentes? 
5.6 ¿Mantiene la organización contacto con grupos de interés especiales u otros foros especializados en seguridad y asociaciones profesionales? 
5.7a ¿Se recopila y analiza la información relativa a las amenazas a la seguridad de la información para generar inteligencia sobre amenazas? 
5.7b ¿La organización clasifica las amenazas a nivel estratégico, táctico y operativo? 
5.7c ¿Comparte la organización inteligencia sobre amenazas con otras organizaciones para mejorar la inteligencia sobre amenazas en general? 
5.8a ¿Integra la organización la seguridad de la información en la gestión de proyectos? 
5.8b " ¿Se evalúan y tratan los riesgos de seguridad de la información en una etapa temprana y periódicamente como parte de los riesgos del proyecto a lo largo de su ciclo de vida?" 
5.8c ¿Se determinan los requisitos de seguridad de la información para todo tipo de proyectos? 
5.9a ¿Se ha desarrollado y mantenido un inventario de activos de información y otros activos asociados, incluyendo a sus propietarios? 
5.9b ¿Es el inventario de activos información y otros activos asociados preciso, actualizado, coherente y alineado con otros inventarios? 
5.9c ¿Se incluye la ubicación de los activos en el inventario? 
5.9d ¿Se clasifican los activos de acuerdo con el esquema de clasificación de la organización? 
5.9e ¿Se asigna la propiedad de los activos cuando se crean o se transfieren? 
5.9f ¿Se reasigna la propiedad de los activos cuando los propietarios dejan el puesto o cambian de rol? 
5.10a ¿Se han identificado, documentado e implementado las normas para el uso aceptable y los procedimientos para el manejo de la información y otros activos asociados? 
5.10b ¿Ha establecido la organización una política específica sobre el uso aceptable de la información y otros activos asociados y la ha comunicado a cualquier persona que utilice o maneje información y otros activos asociados? 
5.10c ¿Ha desarrollado e implementado la organización procedimientos de uso aceptable? 
5.11a ¿Devuelven el personal y otras partes interesadas todos los activos de la organización que poseen tras la modificación o finalización de su empleo, contrato o acuerdo? 
5.11b ¿Identifica y documenta la organización claramente toda la información y otros activos asociados que deben devolverse? 
5.12a ¿Se clasifica la información según las necesidades de seguridad de la información de la organización, basándose en la confidencialidad, la integridad, la disponibilidad y los requisitos de las partes interesadas pertinentes? 
5.12b ¿Ha establecido la organización una política específica sobre la clasificación de la información y la ha comunicado a todas las partes interesadas pertinentes? 
5.12c ¿El sistema de clasificación de la información de la organización tiene en cuenta los requisitos de confidencialidad, integridad y disponibilidad? 
5.12d ¿Es el sistema de clasificación coherente en toda la organización? 
5.13a ¿Ha desarrollado e implementado la organización un conjunto adecuado de procedimientos para el etiquetado de la información, de acuerdo con el esquema de clasificación de la información? 
5.13b ¿Se informa al personal y a otras partes interesadas sobre los procedimientos de etiquetado? 
5.14a ¿Existen normas, procedimientos o acuerdos de transferencia de información para todos los tipos de instalaciones de transferencia dentro de la organización y entre la organización y otras partes? 
5.14b ¿Ha establecido la organización y comunicado una política específica sobre transferencia de información a todas las partes interesadas relevantes? 
5.15a ¿Se han establecido e implementado normas para controlar el acceso físico y lógico a la información y a otros activos asociados, con base en los requisitos de seguridad del negocio y de la información? 
5.15b ¿Ha establecido la organización una política específica para el control de acceso? 
5.16 ¿Gestiona la organización el ciclo de vida completo de las identidades? 
5.17a ¿La asignación y gestión de la información de autenticación está controlada por un proceso de gestión? 
5.17b ¿La asignación y gestión de la información de autenticación incluye asesorar al personal sobre el manejo adecuado de la información de autenticación? 
5.17c ¿Se informa al personal que tiene acceso o utiliza la autenticación sobre sus responsabilidades? 
5.17d ¿Dispone la organización de un sistema de gestión de contraseñas? 
5.18a ¿Se otorgan, revisan, modifican y eliminan los derechos de acceso a la información y otros activos asociados de acuerdo con la política y las normas de control de acceso específicas de la organización? 
5.18b ¿Cuenta la organización con un proceso para la revisión de los derechos de acceso? 
5.19 ¿Se han definido e implementado procesos y procedimientos para gestionar los riesgos de seguridad de la información asociados al uso de los productos o servicios del proveedor? 
5.20 ¿Se han establecido y acordado con cada proveedor los requisitos de seguridad de la información pertinentes según el tipo de relación con el proveedor? 
5.21 ¿Se han definido e implementado procesos y procedimientos para gestionar los riesgos de seguridad de la información asociados a la cadena de suministro de productos y servicios de TIC? 
5.22 ¿La organización supervisa, revisa, evalúa y gestiona periódicamente los cambios en las prácticas de seguridad de la información y la prestación de servicios de los proveedores? 
5.23a ¿Se han establecido procesos para la adquisición, el uso, la gestión y la salida de los servicios en la nube de acuerdo con los requisitos de seguridad de la información de la organización? 
5.23b ¿Ha establecido y comunicado la organización una política específica sobre el uso de los servicios en la nube a todas las partes interesadas pertinentes? 
5.24a ¿Ha establecido la organización procesos adecuados de gestión de incidentes de seguridad de la información? 
5.24b ¿Ha definido la organización las funciones y responsabilidades para el proceso de gestión de incidentes de seguridad de la información? 
5.25 ¿Cuenta la organización con un esquema de categorización y priorización de incidentes de seguridad de la información? 
5.26 ¿Se responde a los incidentes de seguridad de la información de acuerdo con los procedimientos documentados? 
5.27 ¿Ha establecido la organización procedimientos para cuantificar y supervisar los tipos, volúmenes y costes de los incidentes de seguridad de la información? 
5.28 ¿Ha establecido e implementado la organización procedimientos para la identificación, recopilación, adquisición y conservación de evidencia relacionada con eventos de seguridad de la información? 
5.29 ¿Determina la organización sus requisitos para adaptar los controles de seguridad de la información durante una interrupción? 
5.30a ¿Se ha planificado, implementado, mantenido y probado la preparación para las TIC con base en los objetivos y requisitos de continuidad del negocio? 
5.30b ¿Ha realizado la organización un Análisis de Impacto en el Negocio (BIA) para determinar los requisitos de continuidad de las TIC? 
5.31 ¿Se han identificado, documentado y actualizado los requisitos legales, estatutarios, reglamentarios y contractuales relevantes para la seguridad de la información? 
5.32 ¿Ha implementado la organización procedimientos adecuados para proteger los derechos de propiedad intelectual? 
5.33a ¿Protege la organización los registros contra pérdida, destrucción, falsificación, acceso no autorizado y divulgación no autorizada? 
5.33b ¿Utiliza la organización sistemas de almacenamiento de datos que permitan la recuperación de los registros en un plazo y formato aceptables? 
5.34a ¿Ha identificado y cumplido la organización los requisitos relativos a la preservación de la privacidad y la protección de la información de identificación personal (PII) de acuerdo con las leyes y normativas aplicables y los requisitos contractuales? 
5.34b ¿Ha establecido y comunicado la organización una política específica sobre privacidad y protección de la PII a todas las partes interesadas pertinentes? 
5.35 ¿Cuenta la organización con procesos para realizar revisiones independientes? 
5.36 ¿Cuenta la organización con un proceso para verificar el cumplimiento de los requisitos de seguridad de la información definidos en la política de seguridad de la información, las políticas específicas, las normas, los estándares y otras normativas aplicables? 
5.37 ¿Se documentan los procedimientos operativos de los medios de tratamiento de la información y se ponen a disposición del personal que los necesita?`;

const lines = rawData.split('\n').filter(l => l.trim() !== '');

const parsedItems = lines.map(line => {
    const spaceIndex = line.indexOf(' ');
    const id = line.substring(0, spaceIndex).trim();
    let text = line.substring(spaceIndex + 1).trim();
    
    // Remove quotes if present
    if (text.startsWith('"')) text = text.substring(1);
    if (text.endsWith('"')) text = text.substring(0, text.length - 1);
    text = text.trim();

    return {
        id_norma: id,
        pregunta: text
    };
});

try {
  // First, delete old ones
  db.prepare("DELETE FROM preguntas WHERE id_norma LIKE '5.%'").run();

  const stmt = db.prepare(`
    INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.id_norma, "Dominio 5: Organizacional", "Control Organizacional", "2022", item.pregunta, 1);
    }
  });

  insertMany(parsedItems);
  
  const count = db.prepare("SELECT COUNT(*) as c FROM preguntas WHERE id_norma LIKE '5.%'").get().c;
  console.log("Successfully replaced Dominio 5 items. Total count:", count);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}
