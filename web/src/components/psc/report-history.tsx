import { $, component$ } from '@builder.io/qwik';
import Icon from '~/components/core/icon';
import { generatePDF } from '~/utils/pdf-generator';
import type { Sections } from '~/types/PSC';
import { calcularPuntajesConsistentes } from '~/utils/madurez';
import { translateKeys } from '~/utils/key-translator';

interface Report {
    id: number;
    createdAt: string | null;
    userName: string;
    score: number;
    completedCount: number;
    totalCount: number;
    data?: string; // JSON with checkedItems
}

export default component$((props: { reports: Report[], sections: Sections }) => {
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        const isoStr = dateStr.replace(' ', 'T');
        const date = new Date(isoStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Guayaquil'
        });
    };

    const handleDownloadDetail = $((report: Report) => {
        if (!report.data) return;
        try {
            const parsedData = translateKeys(JSON.parse(report.data));
            // Ensure compatibility with the generatePDF expected structure
            generatePDF({
                userName: report.userName,
                sections: props.sections,
                checkedItems: parsedData.checkedItems || parsedData,
                progresoParcialDecimal: parsedData.progresoParcialDecimal || {},
                ignoredItems: parsedData.ignoredItems || {},
                evidenceLinks: parsedData.evidenceLinks || {},
                totalProgress: { 
                    completed: report.completedCount, 
                    outOf: report.totalCount 
                }
            });
        } catch (e) {
            console.error('Error downloading detailed report:', e);
        }
    });

    const getReportScores = (report: Report) => {
        let isoScore = report.score;
        let egsiScore = report.score;
        let clausesScore = report.score;
        let generalIsoScore = report.score;

        if (report.data) {
            try {
                const parsed = translateKeys(JSON.parse(report.data));
                let calculated: any = null;
                const getCalculated = () => {
                    if (!calculated) {
                        const checkedItems = parsed.checkedItems || parsed;
                        const ignoredItems = parsed.ignoredItems || {};
                        const evidenceLinks = parsed.evidenceLinks || {};
                        calculated = calcularPuntajesConsistentes(props.sections, {
                            completed: checkedItems,
                            ignored: ignoredItems,
                            evidenceLinks: evidenceLinks,
                            progresoParcialDecimal: parsed.progresoParcialDecimal || {}
                        });
                    }
                    return calculated;
                };

                if (typeof parsed.isoScore === 'number') {
                    isoScore = parsed.isoScore;
                } else {
                    isoScore = getCalculated().isoScore;
                }

                if (typeof parsed.egsiScore === 'number') {
                    egsiScore = parsed.egsiScore;
                } else {
                    egsiScore = getCalculated().egsiScore;
                }

                if (typeof parsed.clausesScore === 'number') {
                    clausesScore = parsed.clausesScore;
                } else {
                    clausesScore = getCalculated().clausesScore;
                }

                generalIsoScore = getCalculated().generalIsoScore;
            } catch (e) {
                console.error('Error parsing report data:', e);
            }
        }
        return { isoScore, egsiScore, clausesScore, generalIsoScore };
    };

    return (
        <div class="mt-12 w-full max-w-4xl mx-auto p-6 bg-front rounded-[2rem] shadow-xl border border-gray-800/40 backdrop-blur-md">
            <h3 class="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 font-extrabold mb-6 flex items-center gap-3">
                <div class="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Icon icon="all" width={18} height={18} />
                </div>
                Historial de Reportes (Respaldos)
            </h3>

            {props.reports.length === 0 ? (
                <div class="text-center py-10 bg-black/10 rounded-2xl border border-dashed border-gray-800/60">
                    <p class="text-sm opacity-60 italic text-gray-400">No hay reportes guardados todavía.</p>
                </div>
            ) : (
                <div class="overflow-x-auto rounded-2xl border border-gray-800/40 bg-black/20">
                    <table class="table w-full border-collapse">
                        <thead>
                            <tr class="border-b border-gray-800/60 bg-gray-900/30 text-gray-400 text-[10px] uppercase tracking-wider font-black">
                                <th class="py-4 px-5">Fecha de Respaldo</th>
                                <th class="py-4 px-5">Usuario</th>
                                <th class="py-4 px-5">Progreso Detallado</th>
                                <th class="py-4 px-5">Controles</th>
                                <th class="py-4 px-5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-800/40">
                            {props.reports.map((report) => {
                                const scores = getReportScores(report);
                                return (
                                    <tr key={report.id} class="hover:bg-gray-800/20 transition-all duration-300 border-b border-gray-800/20">
                                        <td class="py-4 px-5 text-xs font-medium text-gray-400">{formatDate(report.createdAt)}</td>
                                        <td class="py-4 px-5 font-bold text-gray-200">{report.userName}</td>
                                        <td class="py-4 px-5">
                                            <div class="flex flex-col sm:flex-row flex-wrap gap-2">
                                                <span class="inline-flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide" title="Progreso General de la ISO 27001 (Controles + Cláusulas)">
                                                    {scores.generalIsoScore.toFixed(2)}% ISO Gral.
                                                </span>
                                                <span class="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide" title="Progreso de Controles (Anexo A)">
                                                    {scores.isoScore.toFixed(2)}% Controles
                                                </span>
                                                <span class="inline-flex items-center justify-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide" title="Progreso de EGSI">
                                                    {scores.egsiScore.toFixed(2)}% EGSI
                                                </span>
                                                <span class="inline-flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide" title="Progreso de Cláusulas">
                                                    {scores.clausesScore.toFixed(2)}% Cláusulas
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-5 text-xs font-semibold text-gray-400">{report.completedCount} / {report.totalCount}</td>
                                        <td class="py-4 px-5 text-right">
                                            <button 
                                                onClick$={() => handleDownloadDetail(report)}
                                                class="btn btn-xs btn-outline border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-400 text-gray-400 rounded-xl px-3 py-1 font-bold tracking-wide transition-all duration-300 gap-1.5 inline-flex items-center"
                                                title="Descargar Diagnóstico Completo"
                                            >
                                                <Icon icon="download" width={11} height={11} />
                                                <span>Detalle</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});
