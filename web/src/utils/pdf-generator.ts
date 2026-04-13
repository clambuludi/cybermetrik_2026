import type { Section } from '~/types/PSC';

interface ReportData {
    userName: string;
    sections: Section[];
    checkedItems: Record<string, boolean>;
    totalProgress: { completed: number; outOf: number };
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
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    // --- Header ---
    doc.setFillColor(0, 174, 239);
    doc.rect(14, 10, 20, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('CNT', 18, 22);

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(22);
    doc.text('Reporte de Seguridad Personal', 40, 20);

    doc.setFontSize(12);
    doc.setTextColor(99, 45, 136);
    doc.text('CyberMetrik Security Checklist', 40, 28);

    doc.setFontSize(11);
    doc.setTextColor(0, 174, 239);
    doc.text(`Generado para: ${userName}`, 40, 35);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${today}`, pageWidth - 15, 20, { align: 'right' });

    // --- Summary Section ---
    doc.setDrawColor(200);
    doc.line(14, 42, pageWidth - 14, 42);

    const percentage = Math.round((data.totalProgress.completed / data.totalProgress.outOf) * 100) || 0;

    doc.setFontSize(14);
    doc.setTextColor(0, 174, 239);
    doc.text('Resumen de Progreso', 14, 52);

    doc.setFontSize(12);
    doc.setTextColor(50);
    doc.text(`Puntaje Global: ${percentage}% Completado`, 14, 60);
    doc.text(`Items Cumplidos: ${data.totalProgress.completed} / ${data.totalProgress.outOf}`, 14, 67);

    // --- Detailed Table ---
    const tableRows: any[] = [];

    data.sections.forEach((section) => {
        let sectionCompleted = 0;
        const totalInSection = section.checklist.length;

        section.checklist.forEach(item => {
            const id = item.point.toLowerCase().replace(/ /g, '-');
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
            fillColor: [99, 45, 136],
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
            const id = item.point.toLowerCase().replace(/ /g, '-');
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
        doc.setTextColor(99, 45, 136); // Purple for section title
        doc.setFont('helvetica', 'bold');
        doc.text(`${group.title} (${group.progress}% completado)`, 14, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 8;

        // Urgent Actions in this section (top 3)
        if (group.urgent.length > 0) {
            doc.setFontSize(10);
            doc.setTextColor(239, 68, 68); // Red
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
            doc.setTextColor(0, 174, 239); // Cyan
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
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.setFillColor(0, 174, 239);
    doc.rect(14, 10, 20, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('CNT', 18, 22);

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(22);
    doc.text('Reporte General de Clientes', 40, 20);
    doc.setFontSize(12);
    doc.setTextColor(99, 45, 136);
    doc.text('CyberMetrik Security Checklist', 40, 28);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${today}`, pageWidth - 15, 20, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(14, 35, pageWidth - 14, 35);

    const averageScore = reports.length ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length) : 0;
    doc.setFontSize(12);
    doc.setTextColor(0, 174, 239);
    doc.text(`Total Clientes: ${clients.length}   |   Total Reportes: ${reports.length}   |   Promedio General: ${averageScore}%`, 14, 43);

    const tableRows = clients.map(client => {
        const score = clientScores[client.id];
        const reportCount = reports.filter(r => r.userId === client.id).length;
        const scoreStr = score !== null ? `${score}%` : 'N/A';
        const dateStr = client.createdAt ? new Date(client.createdAt.replace(' ', 'T')).toLocaleDateString('es-ES') : 'N/A';
        return [client.name, client.email, scoreStr, reportCount.toString(), dateStr];
    });

    autoTable(doc, {
        startY: 50,
        head: [['Cliente', 'Email', 'Ultimo Puntaje', 'Reportes', 'Registrado']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 174, 239] }
    });

    doc.save('CyberMetrik_Admin_Reporte_General.pdf');
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
    doc.setTextColor(99, 45, 136);
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
        headStyles: { fillColor: [99, 45, 136] }
    });

    doc.save(`Historial_CyberMetrik_${client.name.replace(/\s+/g, '_')}.pdf`);
};
