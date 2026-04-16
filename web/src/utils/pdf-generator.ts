import type { Section } from '~/types/PSC';

interface ReportData {
    userName: string;
    sections: Section[];
    checkedItems: Record<string, boolean>;
    totalProgress: { completed: number; outOf: number };
    globalMaturity?: number; // Cumulative maturity trend score
}

export const generatePDF = async (data: ReportData) => {
    // Use dynamic imports to bypass build-time resolution issues
    const jspdfModule = await import('jspdf') as any;
    const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
    const autoTableModule = await import('jspdf-autotable') as any;
    const autoTable = autoTableModule.default || autoTableModule;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Sanitize strings to avoid encoding issues with standard fonts
    // eslint-disable-next-line no-control-regex
    const clean = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\u0000-\u007F]/g, "");
    
    const userName = clean(data.userName);
    const today = new Date().toLocaleString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Guayaquil'
    });

    // --- Institutional Header ---
    const headerHeight = 24;
    const logoColumnWidth = 50;
    const headerBlue = [0, 174, 239]; // RGB for #00aeef
    
    doc.setDrawColor(headerBlue[0], headerBlue[1], headerBlue[2]);
    doc.setLineWidth(0.4);
    
    // Outer border (Draw only, no fill for pure white background)
    doc.rect(14, 10, pageWidth - 28, headerHeight);
    
    // Vertical separator
    doc.line(14 + logoColumnWidth, 10, 14 + logoColumnWidth, 10 + headerHeight);
    
    // Horizontal separator in right column
    doc.line(14 + logoColumnWidth, 10 + (headerHeight / 2), pageWidth - 14, 10 + (headerHeight / 2));
    
    // 1. Logo Cell (Left)
    try {
        // Draw a solid white background first (in case image is transparent)
        doc.setFillColor(255, 255, 255);
        doc.rect(14.5, 10.5, logoColumnWidth - 1, headerHeight - 1, 'F');
        
        // Add the logo on top
        doc.addImage("/cnt.png", "PNG", 16, 11, 46, 22);
    } catch (e) {
        doc.setTextColor(headerBlue[0], headerBlue[1], headerBlue[2]);
        doc.setFontSize(16);
        doc.text("CNT", 14 + (logoColumnWidth / 2), 10 + (headerHeight / 2) + 2, { align: 'center' });
    }
    
    // 2. Text Cells (Right)
    doc.setTextColor(headerBlue[0], headerBlue[1], headerBlue[2]);
    const rightCellCenterX = 14 + logoColumnWidth + ((pageWidth - 28 - logoColumnWidth) / 2);
    
    // Top Right: Gerencia (Bold and Blue)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("GERENCIA NACIONAL DE CIBERSEGURIDAD Y CONTROL", rightCellCenterX, 17.5, { align: 'center' });
    
    // Bottom Right: Jefatura (Blue)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("JEFATURA DE CIBERSEGURIDAD OFENSIVA", rightCellCenterX, 28, { align: 'center' });

    // Timestamp (outside header, subtle)
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Generado para: ${userName} | ${today}`, 14, 38);
    doc.text(`CyberMetrik Security Checklist`, pageWidth - 14, 38, { align: 'right' });

    // --- Summary Section ---
    doc.setDrawColor(200);
    doc.line(14, 42, pageWidth - 14, 42);

    const percentage = Math.round((data.totalProgress.completed / (data.totalProgress.outOf || 1)) * 100) || 0;

    doc.setFontSize(14);
    doc.setTextColor(0, 174, 239);
    doc.text(`REGISTRO DE PROGRESO A LA FECHA: ${today.toUpperCase()}`, 14, 52);

    doc.setFontSize(12);
    doc.setTextColor(50);
    
    if (data.globalMaturity !== undefined) {
        doc.text(`Nivel de Madurez (Promedio Trend): ${data.globalMaturity}%`, 14, 60);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Puntaje de esta evaluacion: ${percentage}%`, 14, 67);
    } else {
        doc.text(`Puntaje Global: ${percentage}% Completado`, 14, 60);
        doc.text(`Items Cumplidos: ${data.totalProgress.completed} / ${data.totalProgress.outOf}`, 14, 67);
    }

    // --- Detailed Table ---
    const tableRows: any[] = [];

    data.sections.forEach((section) => {
        let sectionCompleted = 0;
        const totalInSection = section.checklist.length;

        section.checklist.forEach(item => {
            const id = item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
            if (data.checkedItems[id]) sectionCompleted++;
        });

        const sectionPercent = Math.round((sectionCompleted / totalInSection) * 100);

        tableRows.push([
            clean(section.title),
            `${sectionCompleted}/${totalInSection}`,
            `${sectionPercent}%`,
            sectionPercent === 100 ? 'Completado' : 'En Progreso'
        ]);
    });

    autoTable(doc, {
        startY: 72,
        head: [['Seccion', 'Items', 'Progreso', 'Estado']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
            fillColor: [0, 174, 239],
            textColor: 255,
            halign: 'center'
        },
        styles: {
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' }
        }
    });

    // --- Recommendations Section ---
    const sectionRecs: { title: string, progress: number, urgent: string[], next: string[] }[] = [];
    const strengths: string[] = [];

    data.sections.forEach((section) => {
        const urgent: string[] = [];
        const next: string[] = [];
        let checkedInSection = 0;
        const totalInSection = section.checklist.length;

        section.checklist.forEach(item => {
            const id = item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
            const isChecked = !!data.checkedItems[id];

            if (isChecked) {
                checkedInSection++;
            } else {
                if (item.priority === 'essential') {
                    urgent.push(clean(item.point));
                } else {
                    next.push(clean(item.point));
                }
            }
        });

        const progress = Math.round((checkedInSection / totalInSection) * 100) || 0;

        if (checkedInSection === totalInSection && totalInSection > 0) {
            strengths.push(clean(section.title));
        } else if (totalInSection > 0) {
            sectionRecs.push({
                title: clean(section.title),
                progress,
                urgent,
                next
            });
        }
    });

    // Sort sections by progress (lowest first) to prioritize neglected areas
    sectionRecs.sort((a, b) => a.progress - b.progress);

    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(0, 174, 239);
    doc.text('Recomendaciones de Seguridad', 14, 20);

    let yPos = 32;

    // List grouped recommendations
    sectionRecs.forEach((group) => {
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFontSize(12);
        doc.setTextColor(0, 174, 239); // Celeste for section title
        doc.setFont('helvetica', 'bold');
        doc.text(`${group.title} (${group.progress}% completado)`, 14, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 8;

        // Urgent Actions in this section (top 3)
        if (group.urgent.length > 0) {
            doc.setFontSize(10);
            doc.setTextColor(40, 45, 55); // Dark gray for readability
            group.urgent.slice(0, 3).forEach(a => {
                if (yPos > 280) { doc.addPage(); yPos = 20; }
                const lines = doc.splitTextToSize(`[!] CRITICO: ${a}`, pageWidth - 25);
                doc.text(lines, 18, yPos);
                yPos += (lines.length * 6);
            });
        }

        // Next Steps in this section (top 2)
        if (group.next.length > 0) {
            doc.setFontSize(10);
            doc.setTextColor(40, 45, 55); // Dark gray for readability
            group.next.slice(0, 2).forEach(a => {
                if (yPos > 280) { doc.addPage(); yPos = 20; }
                const lines = doc.splitTextToSize(`[-] Sugerencia: ${a}`, pageWidth - 25);
                doc.text(lines, 18, yPos);
                yPos += (lines.length * 6);
            });
        }

        yPos += 4; // Space between sections
    });

    // Strengths section at the end
    if (strengths.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(34, 197, 94); // Green
        doc.text('FORTALEZAS (100% completado)', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        strengths.forEach(s => {
            if (yPos > 280) { doc.addPage(); yPos = 20; }
            doc.text(`* Excelente trabajo en la seccion: ${s}.`, 18, yPos);
            yPos += 6;
        });
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('© CyberMetrik - Uso Interno CNT EP', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    // Save the PDF
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
