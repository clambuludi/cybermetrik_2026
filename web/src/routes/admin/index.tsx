import { component$, $ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, useNavigate, z, zod$ } from '@builder.io/qwik-city';
import { db } from '~/db';
import { reports, users } from '~/db/schema';
import { desc, eq } from 'drizzle-orm';
import { verifyToken, COOKIE_NAME } from '~/utils/auth';
import type { DocumentHead } from '@builder.io/qwik-city';
import { generateAdminSummaryPDF } from '~/utils/pdf-generator';

export const useAdminData = routeLoader$(async ({ cookie, redirect }) => {
    // Auth check — admin only
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) throw redirect(302, '/');
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') throw redirect(302, '/');

    // Get all clients
    const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.role, 'client'));

    // Get all reports
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));

    return { users: allUsers, reports: allReports };
});

export const useDeleteClient = routeAction$(async (data, { cookie }) => {
    // Auth check — admin only
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) return { success: false, error: 'No autorizado' };
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') return { success: false, error: 'No autorizado' };

    try {
        // Delete reports first (consistency)
        await db.delete(reports).where(eq(reports.userId, data.userId));
        // Delete user
        await db.delete(users).where(eq(users.id, data.userId));

        return { success: true };
    } catch (e) {
        console.error('Error deleting client:', e);
        return { success: false, error: 'Error al eliminar el cliente' };
    }
}, zod$({
    userId: z.number()
}));

export default component$(() => {
    const data = useAdminData();
    const deleteAction = useDeleteClient();
    const nav = useNavigate();
    const { users: clients, reports: allReports } = data.value;

    const getClientReports = (userId: number) =>
        allReports.filter(r => r.userId === userId);

    const getLatestScore = (userId: number) => {
        const clientReports = getClientReports(userId);
        if (!clientReports.length) return null;

        const report = clientReports[0];
        // If score is 0 but we have data, try to calculate (for legacy reports)
        if (report.score === 0 && report.data) {
            try {
                const parsedData = JSON.parse(report.data);
                const items = parsedData.checkedItems || parsedData;
                const done = Object.values(items).filter(Boolean).length;
                const total = report.totalCount || 259;
                return Math.round((done / total) * 100);
            } catch (e) {
                return 0;
            }
        }

        return report.score;
    };

    const clientScores: Record<number, number | null> = {};
    clients.forEach(client => {
        clientScores[client.id] = getLatestScore(client.id);
    });

    const formatDate = (d: string | null) => {
        if (!d) return 'N/A';
        return new Date(d.replace(' ', 'T')).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div class="max-w-6xl mx-auto p-6 mt-8">
            <div class="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h1 class="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Panel de Administración
                    </h1>
                    <p class="opacity-60 mt-1">Vista global de madurez y gestión de checklist</p>
                </div>
                <div class="flex items-center gap-3">
                    <button 
                        onClick$={() => generateAdminSummaryPDF(clients, allReports, clientScores)}
                        class="btn btn-outline btn-primary shadow-lg shadow-cyan-500/10"
                        disabled={clients.length === 0}
                    >
                        <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5 mr-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Reporte General
                    </button>
                    <a href="/admin/gestor" class="btn btn-primary shadow-lg shadow-cyan-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Gestor de Preguntas
                    </a>
                </div>
            </div>

            {/* Summary Cards */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="bg-front rounded-xl p-5 border border-cyan-500/20 shadow-lg">
                    <p class="text-sm opacity-60">Total Clientes</p>
                    <p class="text-4xl font-black text-cyan-400 mt-1">{clients.length}</p>
                </div>
                <div class="bg-front rounded-xl p-5 border border-purple-500/20 shadow-lg">
                    <p class="text-sm opacity-60">Total Reportes</p>
                    <p class="text-4xl font-black text-purple-400 mt-1">{allReports.length}</p>
                </div>
                <div class="bg-front rounded-xl p-5 border border-green-500/20 shadow-lg">
                    <p class="text-sm opacity-60">Puntaje Promedio</p>
                    <p class="text-4xl font-black text-green-400 mt-1">
                        {allReports.length
                            ? Math.round(allReports.reduce((sum, r) => sum + r.score, 0) / allReports.length)
                            : 0}%
                    </p>
                </div>
            </div>

            {/* Clients Table */}
            <div class="bg-front rounded-xl border border-gray-800/50 shadow-lg p-6">
                <h2 class="text-xl font-bold mb-4 text-primary">Clientes registrados</h2>
                {clients.length === 0 ? (
                    <p class="text-center py-8 opacity-50 italic">No hay clientes registrados aún.</p>
                ) : (
                    <div class="overflow-x-auto">
                        <table class="table w-full">
                            <thead>
                                <tr class="opacity-60 text-secondary">
                                    <th>Cliente</th>
                                    <th>Email</th>
                                    <th>Último puntaje</th>
                                    <th>Reportes</th>
                                    <th>Miembro desde</th>
                                    <th class="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map(client => {
                                    const lastScore = clientScores[client.id];
                                    const clientReportsCount = getClientReports(client.id).length;
                                    return (
                                        <tr 
                                            key={client.id} 
                                            class="hover:bg-gray-800/30 transition-colors cursor-pointer"
                                            onClick$={() => nav(`/admin/client/${client.id}`)}
                                        >
                                            <td>
                                                <div class="flex items-center gap-3">
                                                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span class="font-semibold">{client.name}</span>
                                                </div>
                                            </td>
                                            <td class="opacity-70 text-sm">{client.email}</td>
                                            <td>
                                                {lastScore !== null ? (
                                                    <div class="flex items-center gap-2">
                                                        <progress class={`progress w-24 ${lastScore >= 70 ? 'progress-success' : lastScore >= 40 ? 'progress-warning' : 'progress-error'}`} value={lastScore} max={100} />
                                                        <span class="font-bold text-sm">{lastScore}%</span>
                                                    </div>
                                                ) : (
                                                    <span class="opacity-40 italic text-sm">Sin reportes (0%)</span>
                                                )}
                                            </td>
                                            <td>
                                                <span class="badge badge-outline badge-primary">{clientReportsCount}</span>
                                            </td>
                                            <td class="opacity-60 text-sm">{formatDate(client.createdAt)}</td>
                                            <td class="text-right">
                                                <button 
                                                    onClick$={$(async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`¿Estás seguro de que deseas eliminar a ${client.name}? Se perderán todos sus reportes.`)) {
                                                            await deleteAction.submit({ userId: client.id });
                                                        }
                                                    })}
                                                    class="btn btn-ghost btn-sm text-error hover:bg-error/10"
                                                    title="Eliminar cliente"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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
        </div>
    );
});

export const head: DocumentHead = {
    title: 'Admin — CyberMetrik',
};
