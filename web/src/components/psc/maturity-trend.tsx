import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Chart, registerables } from 'chart.js';
import Icon from '~/components/core/icon';
import type { Sections } from '~/types/PSC';

interface Report {
    id: number;
    createdAt: string | null;
    userName: string;
    score: number;
    data?: string; // JSON with checkedItems
    isFinalized?: number;
    evaluationNumber?: number;
}

type ViewMode = 'temporal' | 'categories';

export default component$((props: { 
    reports: Report[], 
    sections: Sections, 
    showFilter?: boolean,
    currentProgress?: Record<string, boolean>
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
                // Sort by evaluation number ascending
                const sortedReports = [...filteredReports].sort((a, b) => 
                    (a.evaluationNumber || 0) - (b.evaluationNumber || 0)
                );

                const labels = sortedReports.map((r) => 
                    r.isFinalized === 0 ? 'En progreso' : `Ev. ${r.evaluationNumber}`
                );
                
                const fullDates = sortedReports.map(r => 
                    r.createdAt ? new Date(r.createdAt.replace(' ', 'T')).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
                );
                const scores = sortedReports.map(r => r.score);

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
                            pointBackgroundColor: (context: any) => {
                                const index = context.dataIndex;
                                return sortedReports[index].isFinalized === 0 ? '#f59e0b' : '#06b6d4';
                            },
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
                                        const r = sortedReports[items[0].dataIndex];
                                        return r.isFinalized === 0 ? 'Evaluación en Curso' : `Evaluación ${r.evaluationNumber}`;
                                    },
                                    label: (item: any) => [
                                        `Puntaje: ${item.parsed.y}%`,
                                        `Estado: ${sortedReports[item.dataIndex].isFinalized === 0 ? 'Borrador' : 'Finalizada'}`,
                                        `Último cambio: ${fullDates[item.dataIndex]}`
                                    ]
                                }
                            } 
                        }
                    }
                };
            } else {
                // CATEGORIES VIEW (Radar Chart)
                const labels: string[] = [];
                const values: number[] = [];
                
                // If we have currentProgress, use it! Otherwise fallback to latest report
                const useLocalData = !!props.currentProgress;
                let dataToUse: Record<string, boolean> = {};

                if (useLocalData) {
                    dataToUse = props.currentProgress || {};
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
                        } catch (e) {
                            console.error('Error parsing report data:', e);
                        }
                    }
                }

                const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

                props.sections.forEach(section => {
                    labels.push(section.title);
                    const sectionItems = section.checklist || [];
                    if (sectionItems.length === 0) {
                        values.push(0);
                        return;
                    }
                    
                    const done = sectionItems.filter(item => {
                        const itemId = generateId(item.point);
                        return dataToUse[itemId] === true;
                    }).length;
                    
                    values.push(Math.round((done / sectionItems.length) * 100));
                });

                chartConfig = {
                    type: 'radar',
                    data: {
                        labels,
                        datasets: [{
                            label: useLocalData ? 'Situación Actual (%)' : 'Última Evaluación (%)',
                            data: values,
                            backgroundColor: 'rgba(6, 182, 212, 0.2)',
                            borderColor: '#06b6d4',
                            pointBackgroundColor: '#06b6d4',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: '#06b6d4',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100,
                                min: 0,
                                ticks: { display: false, stepSize: 20 },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                                pointLabels: { 
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    font: { size: 10, weight: 'bold' } 
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (context: any) => `${context.label}: ${context.raw}%`
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
                        {viewMode.value === 'temporal' ? 'Tendencia de Madurez' : 'Perfil de Seguridad'}
                    </h3>
                    <p class="text-sm opacity-60">
                        {viewMode.value === 'temporal' 
                            ? 'Evolución de tu nivel de seguridad en el tiempo' 
                            : 'Comparativa de madurez por cada categoría'}
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

