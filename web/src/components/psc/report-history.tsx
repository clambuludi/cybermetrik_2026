import { component$ } from '@builder.io/qwik';
import Icon from '~/components/core/icon';

interface Report {
    id: number;
    createdAt: string | null;
    userName: string;
    score: number;
    completedCount: number;
    totalCount: number;
}

export default component$((props: { reports: Report[] }) => {
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        // SQLite uses "YYYY-MM-DD HH:MM:SS", we need to ensure JS Date can parse it
        // Adding T makes it more ISO-like
        const isoStr = dateStr.replace(' ', 'T');
        const date = new Date(isoStr);
        if (isNaN(date.getTime())) return dateStr; // Fallback to raw string
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div class="mt-12 w-full max-w-4xl mx-auto p-6 bg-front rounded-box shadow-lg border border-gray-800/10">
            <h3 class="text-2xl text-primary font-bold mb-6 flex items-center gap-2">
                <Icon icon="history" width={24} height={24} />
                Historial de Reportes (Respaldos)
            </h3>

            {props.reports.length === 0 ? (
                <p class="text-center py-8 opacity-60 italic">No hay reportes guardados todavía.</p>
            ) : (
                <div class="overflow-x-auto">
                    <table class="table w-full">
                        <thead>
                            <tr class="text-secondary opacity-70">
                                <th>Fecha</th>
                                <th>Usuario</th>
                                <th>Progreso</th>
                                <th>Ítems</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.reports.map((report) => (
                                <tr key={report.id} class="hover:bg-gray-800/30 transition-colors">
                                    <td class="text-sm">{formatDate(report.createdAt)}</td>
                                    <td class="font-semibold text-primary">{report.userName}</td>
                                    <td>
                                        <div class="flex items-center gap-2">
                                            <progress class="progress progress-primary w-20" value={report.score} max="100"></progress>
                                            <span class="font-bold">{report.score}%</span>
                                        </div>
                                    </td>
                                    <td class="opacity-70 text-sm">{report.completedCount} / {report.totalCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});
