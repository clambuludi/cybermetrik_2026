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
    justifications?: Record<string, string>;
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
        { code: 'Cláusulas', name: 'Clausulas ISO 27001 (Req. de Evaluacion)', filter: (item: any) => !item.id_norma.startsWith('A.') && !item.id_norma.startsWith('EGSI.') },
        { code: 'A.5', name: 'Controles Organizacionales (A5)', filter: (item: any) => item.id_norma.startsWith('A.5.') },
        { code: 'A.6', name: 'Controles Personales (A6)', filter: (item: any) => item.id_norma.startsWith('A.6.') },
        { code: 'A.7', name: 'Controles Fisicos (A7)', filter: (item: any) => item.id_norma.startsWith('A.7.') },
        { code: 'A.8', name: 'Controles Tecnologicos (A8)', filter: (item: any) => item.id_norma.startsWith('A.8.') },
        { code: 'EGSI F1', name: 'EGSI Fase 1: Planificacion', filter: (item: any) => Number(item.id_dominio_egsi) === 6 },
        { code: 'EGSI F2', name: 'EGSI Fase 2: Ejecucion', filter: (item: any) => Number(item.id_dominio_egsi) === 7 },
        { code: 'EGSI F3', name: 'EGSI Fase 3: Control (Evaluacion)', filter: (item: any) => Number(item.id_dominio_egsi) === 8 },
        { code: 'EGSI F4', name: 'EGSI Fase 4: Cierre (Mejora)', filter: (item: any) => Number(item.id_dominio_egsi) === 9 },
    ];

    const childrenMap = new Map<string, any[]>();
    const parentItems: any[] = [];
    const parentChildrenCounts = new Map<string, number>();
    const parentNormalizedPointIds = new Map<string, string>();
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
                parentChildrenCounts.set(parentId, (parentChildrenCounts.get(parentId) || 0) + 1);
            } else {
                parentItems.push(item);
                parentNormalizedPointIds.set(idNorma.trim(), generateId(item.point));
            }
        } else {
            parentItems.push(item);
        }
    });

    const getItemHasLink = (item: any) => {
        const itemId = generateId(item.point);
        let hasLink = !!data.evidenceLinks?.[itemId];
        
        const idNorma = item.id_norma;
        if (!hasLink && typeof idNorma === 'string' && idNorma.trim() !== '') {
            const match = idNorma.trim().match(SUB_ITEM_REGEX);
            if (match) {
                const parentPrefix = match[1];
                if (parentChildrenCounts.get(parentPrefix) === 1) {
                    const parentItemId = parentNormalizedPointIds.get(parentPrefix);
                    if (parentItemId) {
                        const parentLink = data.evidenceLinks?.[parentItemId];
                        if (typeof parentLink === 'string' && parentLink.trim() !== '') {
                            hasLink = true;
                        }
                    }
                }
            }
        }
        return hasLink;
    };

    const getItemLink = (item: any) => {
        const itemId = generateId(item.point);
        let link = data.evidenceLinks?.[itemId] || '';
        
        const idNorma = item.id_norma;
        if (!link && typeof idNorma === 'string' && idNorma.trim() !== '') {
            const match = idNorma.trim().match(SUB_ITEM_REGEX);
            if (match) {
                const parentPrefix = match[1];
                if (parentChildrenCounts.get(parentPrefix) === 1) {
                    const parentItemId = parentNormalizedPointIds.get(parentPrefix);
                    if (parentItemId) {
                        const parentLink = data.evidenceLinks?.[parentItemId];
                        if (typeof parentLink === 'string' && parentLink.trim() !== '') {
                            link = parentLink;
                        }
                    }
                }
            }
        }
        return link;
    };

    const getSingleItemScore = (item: any) => {
        const itemId = generateId(item.point);
        if (data.ignoredItems?.[itemId]) return { score: 0, isIgnored: true };
        const val = data.checkedItems[itemId];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        const hasLink = getItemHasLink(item);
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

    const getParentScore = (parent: any) => {
        const parentIdNorma = parent.id_norma?.trim() || '';
        const children = childrenMap.get(parentIdNorma) || [];
        
        if (children.length > 0) {
            let parentSum = 0;
            let activeChildrenCount = 0;
            let parentIgnored = true;
            
            children.forEach(child => {
                const childId = generateId(child.point);
                if (!data.ignoredItems?.[childId]) {
                    parentIgnored = false;
                }
            });
            
            if (parentIgnored) {
                return { score: 0, isIgnored: true };
            }
            
            children.forEach(child => {
                const { score, isIgnored } = getSingleItemScore(child);
                if (!isIgnored) {
                    parentSum += score;
                    activeChildrenCount++;
                }
            });
            
            const parentScore = activeChildrenCount > 0 ? (parentSum / activeChildrenCount) : 0;
            return { score: Math.round(parentScore), isIgnored: false };
        } else {
            const itemId = generateId(parent.point);
            if (data.ignoredItems?.[itemId]) {
                return { score: 0, isIgnored: true };
            }
            const { score } = getSingleItemScore(parent);
            return { score, isIgnored: false };
        }
    };

    const unifiedHead = [['Codigo', 'Control / Dimension', 'Cumplimiento']];
    const unifiedBody: any[] = [];
    const categoryHeaderRowIndices: number[] = [];
    
    let rowIndex = 0;
    
    categories.forEach(cat => {
        let progressPercent = 0;
        const isIsoCategory = cat.name.includes('A5') || cat.name.includes('A6') || cat.name.includes('A7') || cat.name.includes('A8') || cat.name.includes('Clausulas');

        if (isIsoCategory) {
            if (cat.name.includes('A5')) progressPercent = Math.round((scores as any).a5Score);
            else if (cat.name.includes('A6')) progressPercent = Math.round((scores as any).a6Score);
            else if (cat.name.includes('A7')) progressPercent = Math.round((scores as any).a7Score);
            else if (cat.name.includes('A8')) progressPercent = Math.round((scores as any).a8Score);
            else if (cat.name.includes('Clausulas')) progressPercent = Math.round(scores.clausesScore);

            progressPercent = Math.min(100, Math.max(0, progressPercent));
        } else {
            let totalItems = 0;
            let scoreSum = 0;
            const isFase2 = cat.name.includes('Fase 2');

            allItems.forEach(item => {
                if (!cat.filter(item)) return;

                if (isFase2) {
                    if (!item.id_norma || !item.id_norma.startsWith('A.')) return;
                    const idNormaTrim = item.id_norma.trim();
                    if (childrenMap.has(idNormaTrim)) return;
                }

                const itemId = item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
                if (data.ignoredItems?.[itemId] && !isFase2) {
                    return;
                }

                totalItems++;
                const val = data.checkedItems[itemId];
                const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
                const hasLink = getItemHasLink(item);

                const partialVal = data.progresoParcialDecimal?.[itemId];
                const pValue = partialVal !== undefined && partialVal !== null
                  ? Number(partialVal)
                  : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

                let finalScore = 0.0;
                if (numericVal === 1.0 || numericVal === 0.5) {
                    finalScore = hasLink ? pValue : pValue * 0.4;
                }

                scoreSum += finalScore;
            });

            const activeTotal = isFase2 ? 133 : totalItems;
            progressPercent = activeTotal === 0 ? 0 : Math.round((scoreSum / activeTotal) * 100);
            progressPercent = Math.min(100, Math.max(0, progressPercent));
        }
        
        // Add Category Header Row
        categoryHeaderRowIndices.push(rowIndex);
        unifiedBody.push([
            cat.code,
            clean(cat.name),
            `${progressPercent}%`
        ]);
        rowIndex++;
        
        // Only breakdown parent controls if the category is A5, A6, A7, or A8
        const shouldBreakdown = cat.code.startsWith('A.');
        
        if (shouldBreakdown) {
            // Filter and sort parent items for this category
            const catParents = parentItems.filter(p => cat.filter(p));
            catParents.sort((a, b) => {
                const codeA = a.id_norma || '';
                const codeB = b.id_norma || '';
                return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
            });
            
            // Add each Parent Control Row
            catParents.forEach(parent => {
                const { score, isIgnored } = getParentScore(parent);
                const scoreText = isIgnored ? 'N/A' : `${score}%`;
                const indentedName = `   ${clean(parent.point)}`;
                
                unifiedBody.push([
                    parent.id_norma || '-',
                    indentedName,
                    scoreText
                ]);
                rowIndex++;
            });
        }
    });

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
            0: { fontStyle: 'bold', halign: 'center', width: 25 },
            1: { width: 135 },
            2: { halign: 'center', fontStyle: 'bold', textColor: [0, 120, 200], width: 30 }
        },
        margin: { top: 44, bottom: 20, left: 14, right: 14 },
        didParseCell: (dataCell: any) => {
            if (categoryHeaderRowIndices.includes(dataCell.row.index)) {
                dataCell.cell.styles.fillColor = [229, 231, 235]; // Light gray background
                dataCell.cell.styles.fontStyle = 'bold';
                dataCell.cell.styles.textColor = [31, 41, 55];
            }
        },
        didDrawPage: (dataDraw: any) => {
            drawHeader(dataDraw.doc);
        }
    });

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
