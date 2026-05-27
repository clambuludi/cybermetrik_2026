import type { Section } from '~/types/PSC';
import { calcularPuntajesConsistentes } from './madurez';

interface ReportData {
    userName: string;
    sections: Section[];
    checkedItems: Record<string, number | boolean>;
    progresoParcialDecimal?: Record<string, number>;
    totalProgress: { completed: number; outOf: number };
    globalMaturity?: number; // Cumulative maturity trend score
    ignoredItems?: Record<string, boolean>;
    evidenceLinks?: Record<string, string>;
}

export const generatePDF = async (data: ReportData) => {
    // Dynamic imports
    const jspdfModule = await import('jspdf') as any;
    const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
    const autoTableModule = await import('jspdf-autotable') as any;
    const autoTable = autoTableModule.default || autoTableModule;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Accents removal utility
    const clean = (str: string) => {
        if (!str) return '';
        return str.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^\u0000-\u007F]/g, "");
    };
    
    const userName = clean(data.userName);
    const today = new Date().toLocaleString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Guayaquil'
    });

    // --- Institutional Header (All Pages) ---
    const drawHeader = (d: any) => {
        const headerHeight = 22;
        const logoColumnWidth = 40;
        const headerBlue = [0, 174, 239]; // RGB for #00aeef
        
        d.setDrawColor(headerBlue[0], headerBlue[1], headerBlue[2]);
        d.setLineWidth(0.4);
        
        // Header container rect
        d.rect(14, 10, pageWidth - 28, headerHeight);
        
        // Vertical line
        d.line(14 + logoColumnWidth, 10, 14 + logoColumnWidth, 10 + headerHeight);
        
        // Horizontal line
        d.line(14 + logoColumnWidth, 10 + (headerHeight / 2), pageWidth - 14, 10 + (headerHeight / 2));
        
        // Left logo cell
        try {
            d.setFillColor(255, 255, 255);
            d.rect(14.5, 10.5, logoColumnWidth - 1, headerHeight - 1, 'F');
            d.addImage("/cnt.png", "PNG", 16, 11, logoColumnWidth - 4, headerHeight - 2);
        } catch (e) {
            d.setTextColor(headerBlue[0], headerBlue[1], headerBlue[2]);
            d.setFont("helvetica", "bold");
            d.setFontSize(14);
            d.text("CNT EP", 14 + (logoColumnWidth / 2), 10 + (headerHeight / 2) + 2, { align: 'center' });
        }
        
        // Right text cells
        d.setTextColor(headerBlue[0], headerBlue[1], headerBlue[2]);
        const textCenterX = 14 + logoColumnWidth + ((pageWidth - 28 - logoColumnWidth) / 2);
        
        // Top: Gerencia
        d.setFont("helvetica", "bold");
        d.setFontSize(9.5);
        d.text("GERENCIA NACIONAL DE CIBERSEGURIDAD Y CONTROL", textCenterX, 16.5, { align: 'center' });
        
        // Bottom: Jefatura
        d.setFont("helvetica", "normal");
        d.setFontSize(8.5);
        d.text("JEFATURA DE CIBERSEGURIDAD OFENSIVA", textCenterX, 26, { align: 'center' });

        // Metadata subtitle
        d.setFontSize(8);
        d.setTextColor(140);
        d.text(`Evaluado: ${userName} | Fecha: ${today}`, 14, 37);
        d.text(`CyberMetrik Security Checklist - Reporte Ejecutivo`, pageWidth - 14, 37, { align: 'right' });
        
        d.setDrawColor(220);
        d.line(14, 39, pageWidth - 14, 39);
    };

    // Draw header on Page 1
    drawHeader(doc);

    // Collect all checklist items to process
    const allItems: any[] = [];
    data.sections.forEach(section => {
        section.checklist.forEach(item => {
            allItems.push({
                ...item,
                sectionTitle: section.title
            });
        });
    });

    // --- Core Calculations using Unified Utility ---
    const scores = calcularPuntajesConsistentes(data.sections, {
        completed: data.checkedItems,
        ignored: data.ignoredItems || {},
        evidenceLinks: data.evidenceLinks || {},
        progresoParcialDecimal: data.progresoParcialDecimal || {}
    });
    const isoScore = scores.isoScore;
    const egsiScore = scores.egsiScore;

    // --- Page 1: Dual Compliance Indicator Cards (ISO & EGSI) ---
    const cardWidth = (pageWidth - 28 - 6) / 2;
    const cardHeight = 34;
    const cardY = 43;

    const clausesScore = scores.clausesScore;
    const generalIsoScore = (scores as any).generalIsoScore ?? 0;

    // Card 1: ISO 27001:2022 (Combined)
    const card1X = 14;
    doc.setFillColor(248, 250, 252);
    doc.rect(card1X, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(99, 102, 241); // Indigo border
    doc.setLineWidth(0.5);
    doc.rect(card1X, cardY, cardWidth, cardHeight);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("ESTANDAR INTERNACIONAL ISO 27001:2022", card1X + 4, cardY + 5.5);
    doc.setFontSize(14);
    doc.text(`${generalIsoScore.toFixed(2)}%`, card1X + cardWidth - 4, cardY + 13, { align: 'right' });

    // Progress Bar (General ISO)
    const barWidth = cardWidth - 36;
    const barX = card1X + 4;
    const barY = cardY + 11;
    doc.setFillColor(226, 232, 240);
    doc.rect(barX, barY, barWidth, 2, 'F');
    doc.setFillColor(99, 102, 241);
    doc.rect(barX, barY, barWidth * (generalIsoScore / 100), 2, 'F');
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Progreso General (agrupado)", barX, barY + 5.5);

    // Sub-indicators for Card 1
    const subBarWidth = (cardWidth - 12) / 2;
    const subY = cardY + 20;

    // Sub 1: Controles ISO
    const sub1X = card1X + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text("Controles (93 controles)", sub1X, subY + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`${isoScore.toFixed(2)}%`, sub1X + subBarWidth, subY + 3, { align: 'right' });
    
    doc.setFillColor(226, 232, 240);
    doc.rect(sub1X, subY + 5.5, subBarWidth, 1.5, 'F');
    doc.setFillColor(99, 102, 241);
    doc.rect(sub1X, subY + 5.5, subBarWidth * (isoScore / 100), 1.5, 'F');

    // Sub 2: Cláusulas
    const sub2X = card1X + 6 + subBarWidth;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text("Clausulas (7 clausulas)", sub2X, subY + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`${clausesScore.toFixed(2)}%`, sub2X + subBarWidth, subY + 3, { align: 'right' });
    
    doc.setFillColor(226, 232, 240);
    doc.rect(sub2X, subY + 5.5, subBarWidth, 1.5, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(sub2X, subY + 5.5, subBarWidth * (clausesScore / 100), 1.5, 'F');

    // Card 2: EGSI v3.0 (GPR)
    const card2X = card1X + cardWidth + 6;
    doc.setFillColor(248, 250, 252);
    doc.rect(card2X, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(6, 182, 212); // Cyan border
    doc.rect(card2X, cardY, cardWidth, cardHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(8, 145, 178); // Cyan
    const egsiTitle = "ESQUEMA GUBERNAMENTAL DE SEGURIDAD DE LA INFORMACION - EGSI v3.0";
    const splitTitle = doc.splitTextToSize(egsiTitle, cardWidth - 8);
    doc.text(splitTitle, card2X + 4, cardY + 5.5);
    doc.setFontSize(14);
    doc.text(`${egsiScore.toFixed(2)}%`, card2X + cardWidth - 4, cardY + 13, { align: 'right' });

    // Progress Bar (EGSI)
    const egsiBarWidth = cardWidth - 36;
    const egsiBarX = card2X + 4;
    const egsiBarY = cardY + 11;
    doc.setFillColor(226, 232, 240);
    doc.rect(egsiBarX, egsiBarY, egsiBarWidth, 2, 'F');
    doc.setFillColor(6, 182, 212);
    doc.rect(egsiBarX, egsiBarY, egsiBarWidth * (egsiScore / 100), 2, 'F');
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Suma ponderada MINTEL", egsiBarX, egsiBarY + 5.5);
    
    // Bottom border/text for Card 2 to match Card 1's height
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(card2X + 4, cardY + 19, card2X + cardWidth - 4, cardY + 19);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text("Nivel de madurez basado en pesos GPR oficiales.", card2X + 4, cardY + 24);
    doc.text("Cumplimiento mandatorio para instituciones publicas.", card2X + 4, cardY + 28);

    // --- Unified Progress Table ---
    const categories = [
        { name: 'Clausulas ISO 27001 (Req. de Evaluacion)', filter: (item: any) => !item.id_norma.startsWith('A.') && !item.id_norma.startsWith('EGSI.') },
        { name: 'Controles Organizacionales (A5)', filter: (item: any) => item.id_norma.startsWith('A.5.') },
        { name: 'Controles Personales (A6)', filter: (item: any) => item.id_norma.startsWith('A.6.') },
        { name: 'Controles Fisicos (A7)', filter: (item: any) => item.id_norma.startsWith('A.7.') },
        { name: 'Controles Tecnologicos (A8)', filter: (item: any) => item.id_norma.startsWith('A.8.') },
        { name: 'EGSI Fase 1: Planificacion', filter: (item: any) => Number(item.id_dominio_egsi) === 6 },
        { name: 'EGSI Fase 2: Ejecucion', filter: (item: any) => Number(item.id_dominio_egsi) === 7 },
        { name: 'EGSI Fase 3: Control (Evaluacion)', filter: (item: any) => Number(item.id_dominio_egsi) === 8 },
        { name: 'EGSI Fase 4: Cierre (Mejora)', filter: (item: any) => Number(item.id_dominio_egsi) === 9 },
    ];

    const childrenMap = new Map<string, any[]>();
    const parentItems: any[] = [];
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

    allItems.forEach(item => {
        const idNorma = item.id_norma;
        if (typeof idNorma === 'string' && idNorma.trim() !== '') {
            const match = idNorma.trim().match(SUB_ITEM_REGEX);
            if (match) {
                const parentId = match[1];
                if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
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
        if (data.ignoredItems?.[itemId]) return { score: 0, isIgnored: true };
        const val = data.checkedItems[itemId];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        const hasLink = !!data.evidenceLinks?.[itemId];
        const partialVal = data.progresoParcialDecimal?.[itemId];
        const pValue = partialVal !== undefined && partialVal !== null
          ? Number(partialVal)
          : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
        let score = 0;
        if (numericVal === 1.0) {
            score = hasLink ? 100 : 40;
        } else if (numericVal === 0.5) {
            score = Math.round((hasLink ? pValue : pValue * 0.4) * 100);
        }
        return { score, isIgnored: false };
    };

    const getCategoryParentStats = (catName: string, filterFn: (item: any) => boolean) => {
        let totalParents = 0;
        let completedParents = 0;
        let ignoredParents = 0;

        parentItems.forEach(parent => {
            if (!filterFn(parent)) return;
            const parentIdNorma = parent.id_norma?.trim() || '';
            const children = childrenMap.get(parentIdNorma) || [];

            if (children.length > 0) {
                let parentIgnored = true;
                children.forEach(child => {
                    const childId = generateId(child.point);
                    if (!data.ignoredItems?.[childId]) {
                        parentIgnored = false;
                    }
                });

                if (parentIgnored) {
                    ignoredParents++;
                } else {
                    totalParents++;
                    let parentSum = 0;
                    let activeChildren = 0;
                    children.forEach(child => {
                        const { score, isIgnored } = getSingleItemScore(child);
                        if (!isIgnored) {
                            parentSum += score;
                            activeChildren++;
                        }
                    });
                    const parentScore = activeChildren > 0 ? (parentSum / activeChildren) : 0;
                    if (parentScore >= 100) {
                        completedParents++;
                    }
                }
            } else {
                const itemId = generateId(parent.point);
                if (data.ignoredItems?.[itemId]) {
                    ignoredParents++;
                } else {
                    totalParents++;
                    const { score } = getSingleItemScore(parent);
                    if (score >= 100) {
                        completedParents++;
                    }
                }
            }
        });

        return { totalParents, completedParents, ignoredParents };
    };

    const categoryStats = categories.map(cat => {
        let countStr = '';
        let progressPercent = 0;

        const isIsoCategory = cat.name.includes('A5') || cat.name.includes('A6') || cat.name.includes('A7') || cat.name.includes('A8') || cat.name.includes('Clausulas');

        if (isIsoCategory) {
            const { totalParents, completedParents, ignoredParents } = getCategoryParentStats(cat.name, cat.filter);
            
            if (cat.name.includes('A5')) progressPercent = Math.round((scores as any).a5Score);
            else if (cat.name.includes('A6')) progressPercent = Math.round((scores as any).a6Score);
            else if (cat.name.includes('A7')) progressPercent = Math.round((scores as any).a7Score);
            else if (cat.name.includes('A8')) progressPercent = Math.round((scores as any).a8Score);
            else if (cat.name.includes('Clausulas')) progressPercent = Math.round(scores.clausesScore);

            countStr = `${completedParents}/${totalParents}${ignoredParents > 0 ? ` (${ignoredParents} N/A)` : ''}`;
            progressPercent = Math.min(100, Math.max(0, progressPercent));
        } else {
            let totalItems = 0;
            let completedItems = 0;
            let scoreSum = 0;
            let ignoredCount = 0;
            const isFase2 = cat.name.includes('Fase 2');

            allItems.forEach(item => {
                if (!cat.filter(item)) return;

                if (isFase2) {
                    // Contabilizar solo controles del Anexo A (descartar cláusulas)
                    if (!item.id_norma || !item.id_norma.startsWith('A.')) return;
                    // Descartar controles padres que contienen sub-ítems
                    const idNormaTrim = item.id_norma.trim();
                    if (childrenMap.has(idNormaTrim)) return;
                }

                const itemId = item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
                if (data.ignoredItems?.[itemId] && !isFase2) {
                    ignoredCount++;
                    return;
                }

                totalItems++;
                const val = data.checkedItems[itemId];
                const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
                const hasLink = !!data.evidenceLinks?.[itemId];

                const partialVal = data.progresoParcialDecimal?.[itemId];
                const pValue = partialVal !== undefined && partialVal !== null
                  ? Number(partialVal)
                  : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

                let finalScore = 0.0;
                if (numericVal === 1.0 || numericVal === 0.5) {
                    finalScore = hasLink ? pValue : pValue * 0.4;
                }

                scoreSum += finalScore;
                if (numericVal === 1.0 || numericVal === 0.5) {
                    completedItems++;
                }
            });

            const activeTotal = isFase2 ? 133 : totalItems;
            progressPercent = activeTotal === 0 ? 0 : Math.round((scoreSum / activeTotal) * 100);
            progressPercent = Math.min(100, Math.max(0, progressPercent));
            
            countStr = isFase2 
                ? `${completedItems}/133` 
                : `${completedItems}/${activeTotal + ignoredCount}${ignoredCount > 0 ? ` (${ignoredCount} N/A)` : ''}`;
        }

        return {
            name: cat.name,
            countStr,
            progressStr: `${progressPercent}%`,
            status: progressPercent === 100 ? 'Completado' : progressPercent > 0 ? 'En Progreso' : 'Sin Iniciar',
            rawProgress: progressPercent
        };
    });

    const unifiedHead = [['Dimension / Fase Evaluada', 'Controles', 'Cumplimiento', 'Estado de Progreso']];
    const unifiedBody = categoryStats.map(stat => [
        stat.name,
        stat.countStr,
        stat.progressStr,
        stat.status
    ]);

    autoTable(doc, {
        startY: 82,
        head: unifiedHead,
        body: unifiedBody,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: 255,
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 9
        },
        styles: {
            fontSize: 8.5,
            valign: 'middle'
        },
        columnStyles: {
            0: { fontStyle: 'bold', width: 75 },
            1: { halign: 'center', width: 40 },
            2: { halign: 'center', fontStyle: 'bold', textColor: [0, 120, 200] },
            3: { halign: 'center' }
        }
    });

    // --- Page 2: Gap Analysis & Dynamic Recommendations ---
    const obtenerRecomendacion = (idNorma: string, isCritico: boolean) => {
        const normaStr = (idNorma || '').trim().toUpperCase();
        let dominio = 'gobernanza';
        
        if (normaStr.startsWith("EGSI-") || normaStr.startsWith("EGSI.")) {
            dominio = 'egsi_exclusivo';
        } else if (/^(4|9|10)\./.test(normaStr) || /^(9|4)\b/.test(normaStr)) {
            dominio = 'gobernanza';
        } else if (normaStr.startsWith('A.7.')) {
            dominio = 'fisico';
        } else if (normaStr.startsWith('A.8.')) {
            dominio = 'tecnologico';
        } else if (normaStr.startsWith('A.5.')) {
            const parts = normaStr.split('.');
            if (parts.length > 2) {
                const sub = parseInt(parts[2], 10);
                if (sub >= 1 && sub <= 4) dominio = 'gobernanza';
                else dominio = 'organizacional';
            } else {
                dominio = 'organizacional';
            }
        } else if (normaStr.startsWith('A.6.')) {
            const parts = normaStr.split('.');
            if (parts.length > 2) {
                const sub = parseInt(parts[2], 10);
                if (sub >= 1 && sub <= 3) dominio = 'gobernanza';
                else dominio = 'personas';
            } else {
                dominio = 'personas';
            }
        }

        const plantillas = {
            gobernanza: {
                critico: "Establecer de manera formal el requisito base en el marco de gobierno de ciberseguridad.",
                moderado: "Formalizar el documento y cargar el enlace de evidencia digital en Drive."
            },
            organizacional: {
                critico: "Disenar desde cero las politicas internas y asignar responsables directos de control.",
                moderado: "Revisar y cargar la politica formalizada en el repositorio de Drive."
            },
            personas: {
                critico: "Estructurar controles de seguridad de personal, acuerdos y politicas de seleccion urgente.",
                moderado: "Cargar las actas de compromiso o capacitacion firmadas en Drive."
            },
            fisico: {
                critico: "Disenar plan de contingencia y control de accesos perimetrales de forma prioritaria.",
                moderado: "Subir procedimientos estandarizados o registros de visitas y control fisico a Drive."
            },
            tecnologico: {
                critico: "Implementacion tecnica inmediata: segmentacion, parches o endurecimiento logico.",
                moderado: "Subir evidencia tecnica de configuracion formal o logs de respaldo en Drive."
            },
            egsi_exclusivo: {
                critico: "Levantar el proceso ministerial obligatorio prioritario para evitar observaciones del ente estatal.",
                moderado: "Cargar acta formalizada o informe de cumplimiento legal del EGSI v3.0 en Drive."
            }
        };

        const p = (plantillas as any)[dominio] || plantillas.gobernanza;
        return isCritico ? p.critico : p.moderado;
    };

    const getDomainDisplayName = (dom: string) => {
        switch(dom) {
            case 'gobernanza': return 'Gobernanza y Cumplimiento';
            case 'organizacional': return 'Gobernanza y Politicas Organizacionales';
            case 'personas': return 'Gestion y Seguridad de Personas';
            case 'fisico': return 'Seguridad Fisica y Ambiental';
            case 'tecnologico': return 'Seguridad Tecnologica y de Redes';
            case 'egsi_exclusivo': return 'Hitos y Requisitos Gubernamentales EGSI';
            default: return 'Gobernanza y Cumplimiento';
        }
    };

    // Grouping Gaps logic
    const groupedGaps: Record<string, { category: string, codes: string[], criticidad: string, recomendacion: string }> = {};
    const detailedGapsForPlan: any[] = [];

    allItems.forEach(item => {
        const itemId = item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
        if (data.ignoredItems?.[itemId]) return;

        const val = data.checkedItems[itemId];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        const hasLink = !!data.evidenceLinks?.[itemId];

        let finalScore = 0.0;
        if (numericVal === 1.0) {
            finalScore = hasLink ? 1.0 : 0.4;
        } else if (numericVal === 0.5) {
            finalScore = hasLink ? 0.5 : 0.2;
        }

        if (finalScore < 1.0) {
            const isCritico = numericVal === 0.0;
            const criticidadText = isCritico ? 'CRITICO' : 'MODERADO';
            
            const idNorma = item.id_norma || '-';
            const normaStr = idNorma.trim().toUpperCase();
            let dominio = 'gobernanza';
            
            if (normaStr.startsWith("EGSI-") || normaStr.startsWith("EGSI.")) {
                dominio = 'egsi_exclusivo';
            } else if (/^(4|9|10)\./.test(normaStr) || /^(9|4)\b/.test(normaStr)) {
                dominio = 'gobernanza';
            } else if (normaStr.startsWith('A.7.')) {
                dominio = 'fisico';
            } else if (normaStr.startsWith('A.8.')) {
                dominio = 'tecnologico';
            } else if (normaStr.startsWith('A.5.')) {
                const parts = normaStr.split('.');
                if (parts.length > 2) {
                    const sub = parseInt(parts[2], 10);
                    if (sub >= 1 && sub <= 4) dominio = 'gobernanza';
                    else dominio = 'organizacional';
                } else {
                    dominio = 'organizacional';
                }
            } else if (normaStr.startsWith('A.6.')) {
                const parts = normaStr.split('.');
                if (parts.length > 2) {
                    const sub = parseInt(parts[2], 10);
                    if (sub >= 1 && sub <= 3) dominio = 'gobernanza';
                    else dominio = 'personas';
                } else {
                    dominio = 'personas';
                }
            }

            const key = `${dominio}_${criticidadText}`;
            const rec = obtenerRecomendacion(idNorma, isCritico);
            const categoryName = getDomainDisplayName(dominio);

            if (!groupedGaps[key]) {
                groupedGaps[key] = {
                    category: categoryName,
                    codes: [],
                    criticidad: criticidadText,
                    recomendacion: rec
                };
            }
            groupedGaps[key].codes.push(idNorma);

            detailedGapsForPlan.push({
                code: idNorma,
                name: clean(item.point),
                peso_gpr: Number(item.peso_gpr) || 0.0,
                isCritico
            });
        }
    });

    // --- Page 2: Fortalezas & Plan de Accion Priorizado ---
    doc.addPage();
    drawHeader(doc);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("1. FORTALEZAS & PLAN DE ACCION PRIORIZADO", 14, 44);

    // Fortalezas (100% completed categories)
    doc.setFontSize(10.5);
    doc.setTextColor(34, 197, 94); // Green
    doc.text("FORTALEZAS DE LA INSTITUCION", 14, 52);

    const strengthsList = categoryStats.filter(c => c.rawProgress === 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);

    let strY = 58;
    if (strengthsList.length === 0) {
        doc.text("- Ninguna fase o dimension evaluada ha alcanzado el 100% de cumplimiento todavia.", 14, strY);
        strY += 6;
    } else {
        strengthsList.forEach(s => {
            doc.text(`* Cumplimiento perfecto (100%) en: ${s.name}`, 14, strY);
            strY += 6;
        });
    }

    // Plan de Acción Priorizado
    strY += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 55);
    doc.text("PLAN DE ACCION PRIORIZADO", 14, strY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text("Lista priorizada por nivel de criticidad y peso GPR. Descripciones condensadas a una sola linea.", 14, strY + 5);

    // Sort detailed gaps for the plan: Critical first, then by GPR weight descending
    const sortedGaps = [...detailedGapsForPlan].sort((a, b) => {
        if (a.isCritico && !b.isCritico) return -1;
        if (!a.isCritico && b.isCritico) return 1;
        return b.peso_gpr - a.peso_gpr;
    });

    const getActionPrefix = (code: string) => {
        const c = (code || '').toUpperCase();
        if (c.startsWith('A.5') || c.startsWith('A.6')) return 'Implementar';
        if (c.startsWith('A.7') || c.startsWith('A.8')) return 'Configurar';
        return 'Establecer';
    };

    const planHead = [['Prioridad', 'Codigo', 'Accion Recomendada', 'Impacto GPR (Peso)']];
    const planBody = sortedGaps.slice(0, 10).map((gap, idx) => {
        const prefix = getActionPrefix(gap.code);
        const shortName = gap.name
            .replace(/^Definir y /i, '')
            .replace(/^Implementar /i, '')
            .replace(/^Establecer /i, '')
            .replace(/^Asegurar /i, '')
            .replace(/^Garantizar /i, '');
            
        const actionDescription = `${prefix} ${shortName}`;
        const truncatedAction = actionDescription.length > 70 ? actionDescription.substring(0, 67) + '...' : actionDescription;

        return [
            `${idx + 1}`,
            gap.code,
            truncatedAction,
            `${gap.peso_gpr.toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: strY + 9,
        head: planHead,
        body: planBody,
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229], // Indigo
            textColor: 255,
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 9
        },
        styles: {
            fontSize: 8,
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'center', fontStyle: 'bold', width: 18 },
            1: { halign: 'center', fontStyle: 'bold', width: 22 },
            2: { width: 110 },
            3: { halign: 'center', fontStyle: 'bold', textColor: [79, 70, 229], width: 30 }
        }
    });

    // --- 2. ALERTAS DE CONSISTENCIA DE EVIDENCIA (NUEVA SECCIÓN) ---
    const consistencyAlerts: any[] = [];
    allItems.forEach(item => {
        const itemId = item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
        if (data.ignoredItems?.[itemId]) return;

        const val = data.checkedItems[itemId];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        const link = data.evidenceLinks?.[itemId];

        // NO CUMPLE (0 o undefined) pero tiene campo de evidencia lleno
        if (link && link.trim() !== '') {
            if (numericVal === 0 || numericVal === 0.0 || val === undefined || val === null) {
                consistencyAlerts.push({
                    code: item.id_norma || '-',
                    name: clean(item.point),
                    evidence: clean(link)
                });
            }
        }
    });

    if (consistencyAlerts.length > 0) {
        let finalY = (doc as any).lastAutoTable.finalY || (strY + 9);
        
        // Si no hay suficiente espacio en la página actual, agregar nueva página
        if (finalY + 45 > pageHeight - 20) {
            doc.addPage();
            drawHeader(doc);
            finalY = 44;
        } else {
            finalY += 10;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(194, 65, 12); // Color naranja/óxido para alertas
        doc.text("2. ALERTAS DE CONSISTENCIA: EVIDENCIA CARGADA SIN CUMPLIMIENTO", 14, finalY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Los siguientes items estan marcados como NO CUMPLE o no estan seleccionados, pero contienen notas o enlaces de evidencia.", 14, finalY + 4.5);

        const alertHead = [['Codigo', 'Item / Recomendacion', 'Estado', 'Evidencia / Anotacion']];
        const alertBody = consistencyAlerts.map(alert => [
            alert.code,
            alert.name,
            'No Cumple',
            alert.evidence
        ]);

        autoTable(doc, {
            startY: finalY + 7,
            head: alertHead,
            body: alertBody,
            theme: 'grid',
            headStyles: {
                fillColor: [194, 65, 12],
                textColor: 255,
                halign: 'center',
                fontStyle: 'bold',
                fontSize: 8.5
            },
            styles: {
                fontSize: 8,
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold', width: 22 },
                1: { width: 88 },
                2: { halign: 'center', fontStyle: 'bold', textColor: [194, 65, 12], width: 20 },
                3: { width: 50 }
            }
        });
    }

    // Page numbering and footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(160);
        doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
        doc.text('© CyberMetrik - Uso Interno CNT EP | Ciberseguridad y Control', 14, pageHeight - 8);
    }

    doc.save('CyberMetrik_Reporte_Seguridad.pdf');
};

export const generateAdminSummaryPDF = async (clients: any[], reports: any[], clientScores: Record<number, number | null>) => {
    const jspdfModule = await import('jspdf') as any;
    const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
    const autoTableModule = await import('jspdf-autotable') as any;
    const autoTable = autoTableModule.default || autoTableModule;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const today = new Date().toLocaleString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'America/Guayaquil'
    });

    const headerBlue = [0, 174, 239]; // Celeste CNT

    // --- Corporate Header ---
    doc.setDrawColor(headerBlue[0], headerBlue[1], headerBlue[2]);
    doc.setLineWidth(0.4);
    doc.rect(14, 10, pageWidth - 28, 22);
    
    // Logo area
    try {
        doc.setFillColor(255, 255, 255);
        doc.rect(14.5, 10.5, 40, 21, 'F');
        doc.addImage("/cnt.png", "PNG", 18, 11, 32, 16);
    } catch (e) {
        doc.setTextColor(headerBlue[0], headerBlue[1], headerBlue[2]);
        doc.setFontSize(14);
        doc.text("CNT", 34, 22, { align: 'center' });
    }

    doc.setTextColor(headerBlue[0], headerBlue[1], headerBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text('REPORTE GENERAL DE MADUREZ — CYBERMETRIK', 60, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generado el: ${today} | Uso Administrativo`, 60, 26);

    // --- Statistics Summary ---
    doc.setDrawColor(230);
    doc.line(14, 38, pageWidth - 14, 38);

    const averageScore = reports.length ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length) : 0;
    
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Resumen General:`, 14, 48);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`Total Clientes: ${clients.length}   |   Total Reportes: ${reports.length}   |   Madurez Promedio: ${averageScore}%`, 14, 55);

    // --- Main Client Table ---
    const tableRows = clients.map(client => {
        const score = clientScores[client.id];
        const reportCount = reports.filter(r => r.userId === client.id).length;
        const scoreStr = score !== null ? `${score}%` : '0% (Sin data)';
        const dateStr = client.createdAt ? new Date(client.createdAt.replace(' ', 'T')).toLocaleDateString('es-ES') : 'N/A';
        
        // Status determination
        let status = 'INICIAL';
        if (score && score >= 70) status = 'OPTIMO';
        else if (score && score >= 40) status = 'PROGRESO';

        return [client.name, client.email, scoreStr, status, reportCount.toString(), dateStr];
    });

    autoTable(doc, {
        startY: 65,
        head: [['Cliente', 'Email', 'Nivel Madurez', 'Estado', 'Rpt.', 'Registrado']],
        body: tableRows,
        theme: 'striped',
        headStyles: { 
            fillColor: [0, 174, 239],
            textColor: 255,
            halign: 'center'
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            2: { halign: 'center', fontStyle: 'bold' },
            3: { halign: 'center' },
            4: { halign: 'center' }
        }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('© CyberMetrik - Gerencia Nacional de Ciberseguridad y Control', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save('CyberMetrik_Reporte_General_Admin.pdf');
};

export const generateAdminClientHistoryPDF = async (client: any, reports: any[]) => {
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    doc.setFillColor(0, 174, 239);
    doc.rect(14, 10, 20, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('CNT', 18, 22);

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(22);
    doc.text('Historial de Madurez', 40, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 174, 239);
    doc.text(`Cliente: ${client.name} (${client.email})`, 40, 28);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${today}`, pageWidth - 15, 20, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(14, 33, pageWidth - 14, 33);

    const tableRows = reports.map((report, idx) => {
        const dateStr = report.createdAt ? new Date(report.createdAt.replace(' ', 'T')).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
        return [
            `Evaluacion ${reports.length - idx}`,
            dateStr,
            `${report.score}%`,
            `${report.completedCount} / ${report.totalCount}`
        ];
    });

    autoTable(doc, {
        startY: 40,
        head: [['', 'Fecha', 'Puntaje', 'Items Completados']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 174, 239] }
    });

    doc.save(`Historial_CyberMetrik_${client.name.replace(/\s+/g, '_')}.pdf`);
};
