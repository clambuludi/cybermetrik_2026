import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Chart, registerables } from 'chart.js';
import Icon from '~/components/core/icon';
import type { Sections } from '~/types/PSC';
import { generarDataMapaMadurez } from '~/utils/madurez';

interface Report {
    id: number;
    createdAt: string | null;
    userName: string;
    score: number;
    data?: string; // JSON with checkedItems
    isFinalized?: number;
    evaluationNumber?: number;
}

type ViewMode = 'temporal' | 'categories' | 'summary' | 'radar';

export default component$((props: { 
    reports: Report[], 
    sections: Sections, 
    showFilter?: boolean,
    currentProgress?: Record<string, boolean | number>,
    ignoredItems?: Record<string, boolean>,
    evidenceLinks?: Record<string, string>
}) => {
    const chartRef = useSignal<HTMLCanvasElement>();
    const selectedUser = useSignal<string>('all');
    const viewMode = useSignal<ViewMode>('temporal');

    // Get unique users for the filter
    const users = Array.from(new Set(props.reports.map(r => r.userName))).sort();

    useVisibleTask$(({ track }) => {
        track(() => [props.reports, selectedUser.value, viewMode.value, props.currentProgress]);

        Chart.register(...registerables);

        if (chartRef.value) {
            const ctx = chartRef.value.getContext('2d');
            if (!ctx) return;

            // Filter reports by user
            const filteredReports = selectedUser.value === 'all'
                ? props.reports
                : props.reports.filter(r => r.userName === selectedUser.value);

            let chartConfig: any = {};

            if (viewMode.value === 'temporal') {
                // 1. Sort by date ascending to ensure chronological flow
                const chronologicalReports = [...filteredReports].sort((a, b) => {
                    const dateA = new Date((a.createdAt || '0').replace(' ', 'T')).getTime();
                    const dateB = new Date((b.createdAt || '0').replace(' ', 'T')).getTime();
                    return dateA - dateB;
                });

                // 2. Process labels: Finalized reports get Ev #, Drafts get "En progreso"
                // We re-index them here to ensure it's always Ev. 1, 2, 3...
                let finalizedCounter = 0;
                const labels: string[] = [];
                const scores: number[] = [];
                const fullDates: string[] = [];
                const pointColors: string[] = [];

                chronologicalReports.forEach((r) => {
                    const isDraft = r.isFinalized === 0;
                    
                    if (!isDraft) {
                        finalizedCounter++;
                        labels.push(`Ev. ${finalizedCounter}`);
                        pointColors.push('#06b6d4'); // Cyan for finalized
                    } else {
                        labels.push('En progreso');
                        pointColors.push('#f59e0b'); // Orange for draft
                    }
                    
                    scores.push(r.score);
                    fullDates.push(r.createdAt ? new Date(r.createdAt.replace(' ', 'T')).toLocaleDateString('es-ES', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'America/Guayaquil'
                    }) : 'N/A');
                });

                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
                gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');

                chartConfig = {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Nivel de Madurez (%)',
                            data: scores,
                            borderColor: '#06b6d4',
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: '#fff',
                            pointHoverRadius: 8,
                            pointRadius: 6,
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderWidth: 3,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            intersect: false,
                            mode: 'index',
                        },
                        scales: {
                            y: { 
                                beginAtZero: true, 
                                max: 100, 
                                grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                                ticks: { 
                                    color: 'rgba(255, 255, 255, 0.5)', 
                                    font: { size: 11 },
                                    callback: (v: any) => `${v}%` 
                                } 
                            },
                            x: { 
                                grid: { display: false }, 
                                ticks: { 
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    font: { size: 12, weight: 'bold' } 
                                } 
                            }
                        },
                        plugins: { 
                            legend: { display: false }, 
                            tooltip: { 
                                backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                                titleColor: '#06b6d4', 
                                bodyColor: '#fff',
                                padding: 12,
                                cornerRadius: 8,
                                borderColor: 'rgba(6, 182, 212, 0.3)',
                                borderWidth: 1,
                                callbacks: {
                                    title: (items: any) => {
                                        const r = chronologicalReports[items[0].dataIndex];
                                        return r.isFinalized === 0 ? 'Evaluación en Curso' : `Evaluación ${r.evaluationNumber}`;
                                    },
                                    label: (item: any) => [
                                        `Puntaje: ${item.parsed.y}%`,
                                        `Estado: ${chronologicalReports[item.dataIndex].isFinalized === 0 ? 'Borrador' : 'Finalizada'}`,
                                        `Último cambio: ${fullDates[item.dataIndex]}`
                                    ]
                                }
                            } 
                        }
                    }
                };
            }
            if (viewMode.value === 'summary') {
                // SUMMARY VIEW (Pie / Doughnut Chart)
                let cumple = 0;
                let parcial = 0;
                let noCumple = 0;

                const useLocalData = !!props.currentProgress;
                let dataToUse: Record<string, any> = {};
                let ignoredDataToUse: Record<string, any> = {};

                if (useLocalData) {
                    dataToUse = props.currentProgress || {};
                    ignoredDataToUse = props.ignoredItems || {};
                } else {
                    const latestReport = [...filteredReports].sort((a, b) => {
                        const dateA = new Date((a.createdAt || '0').replace(' ', 'T')).getTime();
                        const dateB = new Date((b.createdAt || '0').replace(' ', 'T')).getTime();
                        return dateB - dateA;
                    })[0] || null;

                    if (latestReport && latestReport.data) {
                        try {
                            const parsedData = JSON.parse(latestReport.data);
                            dataToUse = parsedData.checkedItems || parsedData;
                            ignoredDataToUse = parsedData.ignoredItems || {};
                        } catch (e) {
                            console.error('Error parsing report data:', e);
                        }
                    }
                }

                const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

                props.sections.forEach(section => {
                    (section.checklist || []).forEach(item => {
                        const itemId = generateId(item.point);
                        if (ignoredDataToUse[itemId]) return; // Skip "No Aplica"

                        const val = dataToUse[itemId];
                        if (val === 1 || val === true) cumple++;
                        else if (val === 0.5) parcial++;
                        else noCumple++; // Unanswered or 0 is No Cumple
                    });
                });

                const totalAnswered = cumple + parcial + noCumple;
                
                // Percentage out of evaluated items
                const P_cumple = totalAnswered > 0 ? Math.round((cumple / totalAnswered) * 100) : 0;
                const P_parcial = totalAnswered > 0 ? Math.round((parcial / totalAnswered) * 100) : 0;
                const P_noCumple = totalAnswered > 0 ? Math.round((noCumple / totalAnswered) * 100) : 0;

                chartConfig = {
                    type: 'doughnut',
                    data: {
                        labels: ['Cumple (1.0)', 'Cumple Parcialmente (0.5)', 'No Cumple (0.0)'],
                        datasets: [{
                            data: [P_cumple, P_parcial, P_noCumple],
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], // Green, Orange, Red
                            borderWidth: 0,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                            legend: { 
                                position: 'right',
                                labels: { 
                                    color: 'rgba(255, 255, 255, 0.8)', 
                                    font: { size: 14, family: 'Inter' } 
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: (context: any) => ` ${context.label}: ${context.raw}%`
                                }
                            }
                        }
                    }
                };
            }
            if (viewMode.value === 'categories') {
                const labels: string[] = [];
                const countsCumple: number[] = [];
                const countsParcial: number[] = [];
                const countsNoCumple: number[] = [];

                const useLocalData = !!props.currentProgress;
                let dataToUse: Record<string, any> = {};
                let ignoredDataToUse: Record<string, any> = {};

                if (useLocalData) {
                    dataToUse = props.currentProgress || {};
                    ignoredDataToUse = props.ignoredItems || {};
                } else {
                    const latestReport = [...filteredReports].sort((a, b) => {
                        const dateA = new Date((a.createdAt || '0').replace(' ', 'T')).getTime();
                        const dateB = new Date((b.createdAt || '0').replace(' ', 'T')).getTime();
                        return dateB - dateA;
                    })[0] || null;

                    if (latestReport && latestReport.data) {
                        try {
                            const parsedData = JSON.parse(latestReport.data);
                            dataToUse = parsedData.checkedItems || parsedData;
                            ignoredDataToUse = parsedData.ignoredItems || {};
                        } catch (e) {}
                    }
                }

                const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

                props.sections.forEach(section => {
                    labels.push(section.title);
                    const sectionItems = section.checklist || [];
                    
                    let c = 0;
                    let p = 0;
                    let nc = 0;
                    
                    sectionItems.forEach(item => {
                        const itemId = generateId(item.point);
                        if (ignoredDataToUse[itemId]) return; // Skip "No Aplica"

                        const val = dataToUse[itemId];
                        if (val === 1 || val === true) c++;
                        else if (val === 0.5) p++;
                        else nc++; // Unanswered or 0 is No Cumple
                    });
                    
                    countsCumple.push(c);
                    countsParcial.push(p);
                    countsNoCumple.push(nc);
                });

                chartConfig = {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: 'Cumple',
                                data: countsCumple,
                                backgroundColor: '#10b981',
                                borderRadius: 4,
                            },
                            {
                                label: 'Parcial',
                                data: countsParcial,
                                backgroundColor: '#f59e0b',
                                borderRadius: 4,
                            },
                            {
                                label: 'No Cumple',
                                data: countsNoCumple,
                                backgroundColor: '#ef4444',
                                borderRadius: 4,
                            }
                        ]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: { left: 10, right: 30 }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                beginAtZero: true,
                                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                ticks: { 
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    stepSize: 1
                                }
                            },
                            y: {
                                stacked: true,
                                grid: { display: false },
                                ticks: { 
                                    color: '#fff',
                                    font: { size: 12, weight: 'bold' }
                                }
                            }
                        },
                        plugins: {
                            legend: { 
                                display: true,
                                position: 'top',
                                labels: { color: 'rgba(255, 255, 255, 0.8)', font: { family: 'Inter' } }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                titleColor: '#06b6d4',
                                bodyColor: '#fff',
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: (context: any) => ` ${context.dataset.label}: ${context.raw} ítems`
                                }
                            }
                        }
                    },
                    plugins: [{
                        id: 'inlineBarLabels',
                        afterDatasetsDraw(chart: any) {
                            const { ctx } = chart;
                            chart.data.datasets.forEach((dataset: any, i: number) => {
                                const meta = chart.getDatasetMeta(i);
                                if (meta.hidden) return;
                                
                                meta.data.forEach((bar: any, index: number) => {
                                    const val = dataset.data[index] as number;
                                    const total = chart.data.datasets.reduce((sum: number, ds: any) => sum + (ds.data[index] as number), 0);
                                    
                                    if (val > 0 && total > 0) {
                                        const percent = Math.round((val / total) * 100);
                                        
                                        ctx.fillStyle = '#ffffff';
                                        ctx.font = 'bold 12px Inter, sans-serif';
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        
                                        const leftEdge = bar.base;
                                        const rightEdge = bar.x;
                                        const centerX = leftEdge + (rightEdge - leftEdge) / 2;
                                        const centerY = bar.y;
                                        
                                        ctx.shadowColor = 'rgba(0,0,0,0.6)';
                                        ctx.shadowBlur = 4;
                                        ctx.fillText(`${percent}%`, centerX, centerY);
                                        ctx.shadowBlur = 0;
                                    }
                                });
                            });
                        }
                    }]
                };
            }
            if (viewMode.value === 'radar') {
                const useLocalData = !!props.currentProgress;
                let dataToUse: Record<string, any> = {};
                let ignoredDataToUse: Record<string, any> = {};
                let evidenceLinksData: Record<string, any> = {};

                if (useLocalData) {
                    dataToUse = props.currentProgress || {};
                    ignoredDataToUse = props.ignoredItems || {};
                    evidenceLinksData = props.evidenceLinks || {};
                } else {
                    const latestReport = [...filteredReports].sort((a, b) => {
                        const dateA = new Date((a.createdAt || '0').replace(' ', 'T')).getTime();
                        const dateB = new Date((b.createdAt || '0').replace(' ', 'T')).getTime();
                        return dateB - dateA;
                    })[0] || null;

                    if (latestReport && latestReport.data) {
                        try {
                            const parsedData = JSON.parse(latestReport.data);
                            dataToUse = parsedData.checkedItems || parsedData;
                            ignoredDataToUse = parsedData.ignoredItems || {};
                            evidenceLinksData = parsedData.evidenceLinks || {};
                        } catch (e) {}
                    }
                }

                const radarData = generarDataMapaMadurez(props.sections, { 
                    completed: dataToUse, 
                    ignored: ignoredDataToUse, 
                    evidenceLinks: evidenceLinksData 
                });

                chartConfig = {
                    type: 'radar',
                    data: {
                        labels: radarData.map(d => d.eje),
                        datasets: [{
                            label: 'Nivel de Madurez',
                            data: radarData.map(d => Math.round(d.valor * 100)),
                            backgroundColor: 'rgba(6, 182, 212, 0.2)',
                            borderColor: '#06b6d4',
                            pointBackgroundColor: '#06b6d4',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: '#06b6d4',
                            borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                pointLabels: {
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    font: { size: 12, family: 'Inter', weight: 'bold' }
                                },
                                ticks: {
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    backdropColor: 'transparent',
                                    stepSize: 20,
                                    max: 100,
                                    min: 0,
                                    callback: (v: any) => v + '%'
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                titleColor: '#06b6d4',
                                bodyColor: '#fff',
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: (context: any) => {
                                        const val = context.raw;
                                        const lvl = radarData[context.dataIndex].nivel;
                                        return ` ${val}% — Nivel: ${lvl}`;
                                    }
                                }
                            }
                        }
                    }
                };
            }

            const chart = new Chart(chartRef.value, chartConfig);
            return () => chart.destroy();
        }
    });

    const hasData = props.reports.length > 0;

    return (
        <div class="mt-8 w-full max-w-4xl mx-auto p-6 bg-front rounded-box shadow-lg border border-gray-800/50">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 class="text-2xl text-primary font-bold flex items-center gap-2">
                        <Icon icon="analytics" width={24} height={24} />
                        {viewMode.value === 'temporal' && 'Tendencia de Madurez'}
                        {viewMode.value === 'categories' && 'Perfil de Seguridad'}
                        {viewMode.value === 'summary' && 'Resumen Global'}
                        {viewMode.value === 'radar' && 'Mapa de Madurez'}
                    </h3>
                    <p class="text-sm opacity-60">
                        {viewMode.value === 'temporal' && 'Evolución de tu nivel de seguridad en el tiempo'}
                        {viewMode.value === 'categories' && 'Comparativa de madurez por cada categoría'}
                        {viewMode.value === 'summary' && 'Porcentaje de nivel de cumplimiento global sobre las tareas verificadas'}
                        {viewMode.value === 'radar' && 'Nivel de madurez de cada dominio evaluado según ISO 27001'}
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    {/* View Toggle */}
                    <div class="join bg-gray-800 p-1 rounded-lg border border-gray-700">
                        <button 
                            onClick$={() => viewMode.value = 'temporal'}
                            class={`join-item btn btn-xs ${viewMode.value === 'temporal' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            Temporal
                        </button>
                        <button 
                            onClick$={() => viewMode.value = 'categories'}
                            class={`join-item btn btn-xs ${viewMode.value === 'categories' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            Categorías
                        </button>
                        <button 
                            onClick$={() => viewMode.value = 'radar'}
                            class={`join-item btn btn-xs ${viewMode.value === 'radar' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            Mapa Madurez
                        </button>
                        <button 
                            onClick$={() => viewMode.value = 'summary'}
                            class={`join-item btn btn-xs ${viewMode.value === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            Resumen
                        </button>
                    </div>

                    {props.showFilter && (
                        <select
                            value={selectedUser.value}
                            onChange$={(e) => selectedUser.value = (e.target as HTMLSelectElement).value}
                            class="select select-bordered select-sm bg-gray-800 border-gray-700"
                        >
                            <option value="all">Todos los clientes</option>
                            {users.map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div class="h-[350px] w-full relative">
                {!hasData ? (
                    <div class="flex flex-col items-center justify-center h-full opacity-40 italic gap-2 text-center">
                        <Icon icon="info" width={32} height={32} />
                        <p>No hay reportes disponibles para mostrar el análisis.</p>
                    </div>
                ) : (
                    <>
                        {viewMode.value === 'temporal' && props.reports.length < 2 && (
                             <div class="absolute inset-0 flex flex-col items-center justify-center bg-front/80 z-10 text-center p-4">
                                <p class="text-warning text-sm font-bold mb-1">Dato insuficiente</p>
                                <p class="text-xs opacity-70 italic">Se necesitan al menos dos reportes para trazar una línea de tendencia temporal.</p>
                                <button onClick$={() => viewMode.value = 'categories'} class="btn btn-link btn-xs mt-2 text-primary">Ver perfil por categorías</button>
                             </div>
                        )}
                        <canvas ref={chartRef}></canvas>
                    </>
                )}
            </div>
        </div>
    );
});

