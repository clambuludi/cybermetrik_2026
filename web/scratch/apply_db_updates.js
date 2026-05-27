const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../instance/cybermetrik.db');
console.log('Connecting to database at:', dbPath);
const db = new Database(dbPath);

try {
  db.transaction(() => {
    console.log('Applying question text updates to prevent key collisions...');

    const updates = [
      { id: 'A.5.3', text: 'Segregación de tareas, documentado e implementado' },
      { id: 'A.5.5', text: 'Contacto con las autoridades, documentado e implementado' },
      { id: 'A.5.6', text: 'Contacto con grupos de interés especial, documentado e implementado' },
      { id: 'A.6.4.b', text: '¿La organización toma medidas contra el personal y otras partes interesadas pertinentes que han cometido una infracción de la política de seguridad de la información?' },
      { id: 'A.8.9.b', text: '¿Se supervisan y revisan las configuraciones, incluidas las de seguridad, de hardware, software, servicios y redes?' },
      { id: 'A.8.16.a', text: '¿La organización supervisa las redes, los sistemas y las aplicaciones para detectar comportamientos anómalos y evaluar posibles incidentes de seguridad de la información?' }
    ];

    for (const update of updates) {
      const stmt = db.prepare('UPDATE preguntas SET pregunta = ? WHERE id_norma = ?');
      const info = stmt.run(update.text, update.id);
      console.log(`Updated ${update.id}: ${info.changes} row(s) modified.`);
    }
  })();
  console.log('Database updates applied successfully!');
} catch (error) {
  console.error('Failed to apply database updates:', error);
} finally {
  db.close();
}
