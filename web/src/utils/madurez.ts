/**
 * Representa la estructura esperada para cada ítem a evaluar.
 */
export interface ItemEvaluacion {
  id?: string;
  opcion_seleccionada: number | "N/A" | string | null;
  progreso_parcial_decimal?: number | null;
  drive_link?: string | null;
}

/**
 * Resultado del cálculo de madurez.
 */
export interface ResultadoMadurez {
  porcentajeProgreso: number;
  totalElegibles: number;
  totalExcluidosNA: number;
  nivelMadurez: string;
  nivelNumero: number;
  colorHex: string;
}

/**
 * Calcula la madurez de un bloque de respuestas (como las 28 Cláusulas ISO o los bloques del Anexo A)
 * aplicando reglas de negocio estrictas para calcular métricas exactas.
 * 
 * @param items Array de objetos con las respuestas de evaluación
 * @returns Objeto con las métricas calculadas (progreso, total elegibles, nivel de madurez, etc.)
 */
export function calcularMadurezBloque(items: ItemEvaluacion[]): ResultadoMadurez {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      porcentajeProgreso: 0,
      totalElegibles: 0,
      totalExcluidosNA: 0,
      nivelMadurez: 'Ad-hoc / Inicial',
      nivelNumero: 1,
      colorHex: '#EF4444' // Rojo
    };
  }

  let totalExcluidosNA = 0;
  let sumaPuntajesReales = 0;

  for (const item of items) {
    const { opcion_seleccionada, progreso_parcial_decimal, drive_link } = item;

    // Validación para descartar los "N/A"
    if (opcion_seleccionada === 'N/A') {
      totalExcluidosNA++;
      continue;
    }

    // Verificar si existe y es válido el enlace de drive
    const hasDriveLink = typeof drive_link === 'string' && drive_link.trim() !== '';

    // Convertir a número por si acaso viene como string
    const valorSeleccionado = Number(opcion_seleccionada);

    const pValue = progreso_parcial_decimal !== undefined && progreso_parcial_decimal !== null
      ? Number(progreso_parcial_decimal)
      : (valorSeleccionado === 0.5 ? 0.50 : (valorSeleccionado === 1.0 ? 1.00 : 0.00));

    if (valorSeleccionado === 0.0) {
      sumaPuntajesReales += 0.0;
    } else if (valorSeleccionado === 0.5 || valorSeleccionado === 1.0) {
      if (hasDriveLink) {
        sumaPuntajesReales += pValue;
      } else {
        // Penalización del 60% por falta de evidencia (valor * 0.4)
        sumaPuntajesReales += pValue * 0.4;
      }
    }
  }

  // Cálculos globales
  const totalElegibles = items.length - totalExcluidosNA;
  let porcentajeFinal = 0;

  if (totalElegibles > 0) {
    porcentajeFinal = (sumaPuntajesReales / totalElegibles) * 100;
  }

  // Redondeo a 2 decimales
  const porcentajeProgreso = Number(porcentajeFinal.toFixed(2));

  let nivelMadurez = '';
  let nivelNumero = 1;
  let colorHex = '';

  // Determinar nivel de madurez en base al porcentaje final
  if (porcentajeProgreso <= 20) {
    nivelMadurez = 'Ad-hoc / Inicial';
    nivelNumero = 1;
    colorHex = '#EF4444'; // Rojo
  } else if (porcentajeProgreso <= 40) {
    nivelMadurez = 'Repetible / Informal';
    nivelNumero = 2;
    colorHex = '#F97316'; // Naranja
  } else if (porcentajeProgreso <= 60) {
    nivelMadurez = 'Definido / Formalizado';
    nivelNumero = 3;
    colorHex = '#EAB308'; // Amarillo
  } else if (porcentajeProgreso <= 80) {
    nivelMadurez = 'Gestionado / Medido';
    nivelNumero = 4;
    colorHex = '#3B82F6'; // Azul
  } else {
    nivelMadurez = 'Optimizado / Continuo';
    nivelNumero = 5;
    colorHex = '#22C55E'; // Verde
  }

  return {
    porcentajeProgreso,
    totalElegibles,
    totalExcluidosNA,
    nivelMadurez,
    nivelNumero,
    colorHex
  };
}

export interface DataMapaMadurez {
    eje: string;
    valor: number;
    nivel: string;
}

export function generarDataMapaMadurez(
    sections: any[], 
    progress: { 
        completed: Record<string, number | boolean>; 
        ignored: Record<string, boolean>; 
        evidenceLinks?: Record<string, string>;
        progresoParcialDecimal?: Record<string, number>;
    }
): DataMapaMadurez[] {
    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

    return sections.map(section => {
        const itemsEvaluacion: ItemEvaluacion[] = [];
        const isClausesSection = section.title === 'Cláusulas ISO 27001';
        
        if (section.checklist) {
            const parentIdsWithChildren = new Set<string>();
            if (!isClausesSection) {
                section.checklist.forEach((item: any) => {
                    const idNorma = item.id_norma;
                    if (typeof idNorma === 'string' && idNorma.trim() !== '') {
                        const match = idNorma.trim().match(SUB_ITEM_REGEX);
                        if (match) {
                            parentIdsWithChildren.add(match[1]);
                        }
                    }
                });
            }

            for (const item of section.checklist) {
                if (!item.point) continue;

                const idNorma = item.id_norma?.trim() || '';
                if (isClausesSection) {
                    if (typeof idNorma !== 'string' || !idNorma.match(SUB_ITEM_REGEX)) {
                        continue;
                    }
                } else {
                    const isParent = idNorma && parentIdsWithChildren.has(idNorma);
                    if (isParent) continue;
                }

                const id = generateId(item.point);
                const isIgnored = progress.ignored[id] || false;
                const completedVal = progress.completed[id];
                
                const numericVal = typeof completedVal === 'boolean' 
                  ? (completedVal ? 1.0 : 0.0) 
                  : (completedVal ?? 0.0);
                  
                const opcion = isIgnored ? 'N/A' : numericVal;
                const driveLink = progress.evidenceLinks?.[id] || null;
                const partialVal = progress.progresoParcialDecimal?.[id];
                
                itemsEvaluacion.push({
                    id,
                    opcion_seleccionada: opcion,
                    progreso_parcial_decimal: partialVal,
                    drive_link: driveLink
                });
            }
        }

        const madurez = calcularMadurezBloque(itemsEvaluacion);

        let ejeNombre = section.title;
        // Simplificar nombres de ejes para la gráfica
        if (ejeNombre === 'Cláusulas ISO 27001' || ejeNombre.toLowerCase().includes('gobernanza')) {
            ejeNombre = 'Gobernanza';
        } else {
            ejeNombre = ejeNombre.replace('Dominio 5: ', '')
                                 .replace('Dominio 6: ', '')
                                 .replace('Dominio 7: ', '')
                                 .replace('Dominio 8: ', '')
                                 .trim();
        }

        return {
            eje: ejeNombre,
            valor: madurez.porcentajeProgreso / 100, // Número entre 0 y 1
            nivel: madurez.nivelMadurez.split(' / ')[0] // e.g. "Optimizado" en lugar de "Optimizado / Continuo"
        };
    });
}

export function calcularPuntajesConsistentes(
  sections: any[],
  progress: {
    completed: Record<string, number | boolean>;
    ignored: Record<string, boolean>;
    evidenceLinks?: Record<string, string>;
    progresoParcialDecimal?: Record<string, number>;
  }
) {
  if (!Array.isArray(sections)) {
    return {
      isoScore: 0,
      egsiScore: 0,
      clausesScore: 0,
      generalIsoScore: 0,
      a5Score: 0,
      a6Score: 0,
      a7Score: 0,
      a8Score: 0
    };
  }

  let isoSubitemsSum = 0;
  let isoSubitemsActiveCount = 0;
  let clausesSubitemsSum = 0;
  let clausesSubitemsActiveCount = 0;

  let a5SubitemsSum = 0;
  let a5SubitemsActiveCount = 0;
  let a6SubitemsSum = 0;
  let a6SubitemsActiveCount = 0;
  let a7SubitemsSum = 0;
  let a7SubitemsActiveCount = 0;
  let a8SubitemsSum = 0;
  let a8SubitemsActiveCount = 0;

  let egsiObtainedPoints = 0;
  let egsiIgnoredWeight = 0;

  const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
  const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

  for (const section of sections) {
    if (!section?.checklist) continue;

    const isIsoSection = !section.title.includes('EGSI FASE') && section.title !== 'Cláusulas ISO 27001';
    const isClausesSection = section.title === 'Cláusulas ISO 27001';

    const childrenMap = new Map<string, any[]>();
    const parentItems: any[] = [];

    section.checklist.forEach((item: any) => {
      const idNorma = (item as any).id_norma;
      if (typeof idNorma === 'string' && idNorma.trim() !== '') {
        const match = idNorma.trim().match(SUB_ITEM_REGEX);
        if (match) {
          const parentId = match[1];
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }
          childrenMap.get(parentId)!.push(item);
        } else {
          parentItems.push(item);
        }
      } else {
        parentItems.push(item);
      }
    });

    const getSingleItemScore = (item: any) => {
      const itemId = generateId(item.point);
      if (progress.ignored[itemId]) return { score: 0, isIgnored: true };

      const val = progress.completed[itemId];
      const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);

      const partialVal = progress.progresoParcialDecimal?.[itemId];
      const pValue = partialVal !== undefined && partialVal !== null
        ? Number(partialVal)
        : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

      const hasDriveLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';

      let score = 0;
      if (numericVal === 1.0) {
        score = hasDriveLink ? 100 : 40;
      } else if (numericVal === 0.5) {
        score = Math.round((hasDriveLink ? pValue : pValue * 0.4) * 100);
      } else {
        score = 0;
      }

      return { score, isIgnored: false };
    };

    parentItems.forEach(parent => {
      const parentIdNorma = (parent as any).id_norma?.trim() || '';
      const children = childrenMap.get(parentIdNorma) || [];

      if (children.length > 0) {
        let sumScores = 0;
        let activeChildrenCount = 0;
        let parentIgnored = true;

        children.forEach(child => {
          const childId = generateId(child.point);
          const childIgnored = progress.ignored[childId];
          if (!childIgnored) {
            parentIgnored = false;
          }
        });

        children.forEach(child => {
          const { score, isIgnored } = getSingleItemScore(child);
          if (!isIgnored) {
            sumScores += score;
            activeChildrenCount++;

            // Accumulate directly at sub-item level for ISO compliance percentages
            if (isIsoSection) {
              isoSubitemsSum += score;
              isoSubitemsActiveCount++;
            } else if (isClausesSection) {
              clausesSubitemsSum += score;
              clausesSubitemsActiveCount++;
            }

            if (section.title.includes('A5')) {
              a5SubitemsSum += score;
              a5SubitemsActiveCount++;
            } else if (section.title.includes('A6')) {
              a6SubitemsSum += score;
              a6SubitemsActiveCount++;
            } else if (section.title.includes('A7')) {
              a7SubitemsSum += score;
              a7SubitemsActiveCount++;
            } else if (section.title.includes('A8')) {
              a8SubitemsSum += score;
              a8SubitemsActiveCount++;
            }
          }
        });

        if (!parentIgnored) {
          const parentScore = activeChildrenCount > 0 ? (sumScores / activeChildrenCount) : 0;

          // GPR / EGSI requires parent averages because weights are at parent level
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            const weight = Number(children[0].peso_gpr) || 0;
            egsiObtainedPoints += parentScore * weight;
          }
        } else {
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            const weight = Number(children[0].peso_gpr) || 0;
            egsiIgnoredWeight += weight;
          }
        }
      } else {
        const { score, isIgnored } = getSingleItemScore(parent);
        const weight = Number(parent.peso_gpr) || 0;

        if (isIgnored) {
          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            egsiIgnoredWeight += weight;
          }
        } else {
          // Accumulate directly at sub-item level for ISO compliance percentages
          if (isIsoSection) {
            isoSubitemsSum += score;
            isoSubitemsActiveCount++;
          } else if (isClausesSection) {
            clausesSubitemsSum += score;
            clausesSubitemsActiveCount++;
          }

          if (section.title.includes('A5')) {
            a5SubitemsSum += score;
            a5SubitemsActiveCount++;
          } else if (section.title.includes('A6')) {
            a6SubitemsSum += score;
            a6SubitemsActiveCount++;
          } else if (section.title.includes('A7')) {
            a7SubitemsSum += score;
            a7SubitemsActiveCount++;
          } else if (section.title.includes('A8')) {
            a8SubitemsSum += score;
            a8SubitemsActiveCount++;
          }

          const idEgsi = Number(parent.id_dominio_egsi);
          if (idEgsi >= 6 && idEgsi <= 9) {
            egsiObtainedPoints += score * weight;
          }
        }
      }
    });
  }

  const egsiDenominator = 100 - egsiIgnoredWeight;

  const isoScore = isoSubitemsActiveCount <= 0 ? 0 : Number((isoSubitemsSum / isoSubitemsActiveCount).toFixed(2));
  const egsiScore = egsiDenominator <= 0 ? 0 : Number((egsiObtainedPoints / egsiDenominator).toFixed(2));
  const clausesScore = clausesSubitemsActiveCount <= 0 ? 0 : Number((clausesSubitemsSum / clausesSubitemsActiveCount).toFixed(2));

  const totalIsoActiveCount = isoSubitemsActiveCount + clausesSubitemsActiveCount;
  const generalIsoScore = totalIsoActiveCount <= 0 ? 0 : Number(((isoSubitemsSum + clausesSubitemsSum) / totalIsoActiveCount).toFixed(2));

  const a5Score = a5SubitemsActiveCount <= 0 ? 0 : Number((a5SubitemsSum / a5SubitemsActiveCount).toFixed(2));
  const a6Score = a6SubitemsActiveCount <= 0 ? 0 : Number((a6SubitemsSum / a6SubitemsActiveCount).toFixed(2));
  const a7Score = a7SubitemsActiveCount <= 0 ? 0 : Number((a7SubitemsSum / a7SubitemsActiveCount).toFixed(2));
  const a8Score = a8SubitemsActiveCount <= 0 ? 0 : Number((a8SubitemsSum / a8SubitemsActiveCount).toFixed(2));

  return {
    isoScore,
    egsiScore,
    clausesScore,
    generalIsoScore,
    a5Score,
    a6Score,
    a7Score,
    a8Score
  };
}

