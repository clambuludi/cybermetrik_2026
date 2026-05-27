export interface RespuestaControl {
  ID: number;
  ID_Norma: string;
  Dominio_Control: string;
  Pregunta: string;
  puntaje_calculado: number;
}

export interface RecomendacionGenerada {
  id: number;
  norma: string;
  recomendacion: string;
}

const plantillas = {
  gobernanza: {
    critico: "Se identificó una ausencia total en el marco de gobierno y cumplimiento formal. Es mandatorio que la alta dirección establezca el requisito base de manera formal.",
    moderado: "El requisito de gobierno se ejecuta de forma interna, pero carece de la aprobación institucional o la evidencia digital centralizada en Drive que exige la norma. Se requiere formalizar el documento."
  },
  organizacional: {
    critico: "Existe una brecha crítica en la estructura de gestión de la ciberseguridad. Se deben diseñar desde cero las políticas internas y asignar responsables directos.",
    moderado: "La política u objetivo se maneja de forma operativa, pero no se encuentra completamente formalizada ni indexada en el repositorio de Drive. Se recomienda su revisión y carga inmediata."
  },
  personas: {
    critico: "Riesgo crítico asociado al factor humano. Es urgente estructurar controles de seguridad, acuerdos de confidencialidad o políticas de selección antes de otorgar accesos.",
    moderado: "Se ejecutan procesos con el personal pero de manera informal y sin registros firmados. Se deben cargar las actas de compromiso o capacitación correspondientes en Drive."
  },
  fisico: {
    critico: "Ausencia crítica de controles perimetrales y físicos que protejan los activos. Se debe diseñar un plan de contingencia y control de accesos a las instalaciones de manera prioritaria.",
    moderado: "Existen barreras físicas o controles de entorno, pero no están documentados ni estandarizados bajo un procedimiento verificable en Drive."
  },
  tecnologico: {
    critico: "Vulnerabilidad crítica en la infraestructura lógica. Se requiere la implementación inmediata de soluciones técnicas, segmentación de redes o endurecimiento de sistemas.",
    moderado: "La solución tecnológica está operativa, pero carece de una política de configuración técnica formal o logs de respaldo enlazados en el sistema. Se debe subir la evidencia técnica."
  },
  egsi_exclusivo: {
    critico: "Incumplimiento obligatorio del acuerdo ministerial de la Mintel. Se debe levantar el proceso de manera prioritaria para evitar observaciones o glosas del ente de control estatal.",
    moderado: "El requerimiento gubernamental presenta avances, pero carece del acta formalizada o el informe anual exigido por el EGSI v3.0. Se debe cargar el respaldo legal en Drive."
  }
};

/**
 * Determina el dominio de recomendación en base al ID_Norma, considerando las reglas de categorización.
 * @param idNorma Identificador de la norma, ej: "5.10a" o "EGSI-01"
 */
const determinarDominio = (idNorma: string): keyof typeof plantillas => {
  // Manejo de variables nulas o indefinidas por precaución
  if (!idNorma) return 'gobernanza';

  const normaStr = idNorma.trim().toUpperCase();

  if (normaStr.startsWith("EGSI-")) return 'egsi_exclusivo';
  
  if (/^(4|9|10)\./.test(normaStr)) return 'gobernanza';
  if (/^7\./.test(normaStr)) return 'fisico';
  if (/^8\./.test(normaStr)) return 'tecnologico';
  
  if (/^5\./.test(normaStr)) {
    const parts = normaStr.split('.');
    if (parts.length > 1) {
      // parseInt("10a") devolverá 10
      const sub = parseInt(parts[1], 10);
      if (sub >= 1 && sub <= 4) return 'gobernanza';
    }
    return 'organizacional';
  }
  
  if (/^6\./.test(normaStr)) {
    const parts = normaStr.split('.');
    if (parts.length > 1) {
      const sub = parseInt(parts[1], 10);
      if (sub >= 1 && sub <= 3) return 'gobernanza';
    }
    return 'personas';
  }
  
  return 'gobernanza'; // Fallback por defecto
};

/**
 * Procesa un array de respuestas y genera recomendaciones automáticas (Gaps) 
 * para aquellos ítems cuyo cumplimiento no sea perfecto.
 * @param respuestas Array de respuestas procesadas de la base de datos
 */
export const generarRecomendacionesDinamicas = (respuestas: RespuestaControl[]): RecomendacionGenerada[] => {
  return respuestas
    // 1. Omitir los ítems que tengan cumplimiento perfecto
    .filter(r => r.puntaje_calculado < 1.0)
    .map(r => {
      // 2. Determinar el dominio analizando el string de 'ID_Norma'
      const dominio = determinarDominio(r.ID_Norma);
      
      // 3. Evalúa 'puntaje_calculado'
      // Si está <= 0.2 usa 'critico', para el resto (0.2 < x < 1.0) usa 'moderado'
      const nivel = r.puntaje_calculado <= 0.2 ? 'critico' : 'moderado';
      
      const textoPlantilla = plantillas[dominio][nivel];
      
      // 4. Retorna el objeto listo para la UI
      return {
        id: r.ID,
        norma: r.ID_Norma,
        recomendacion: `Para el control ${r.ID_Norma}: ${textoPlantilla}`
      };
    });
};
