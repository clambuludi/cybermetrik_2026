import { $, component$, useContext } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import MaturityTrend from '~/components/psc/maturity-trend';
import { ChecklistContext } from '~/store/checklist-context';
import { db } from '~/db';
import { reports, users } from '~/db/schema';
import { desc, eq } from 'drizzle-orm';
import { verifyToken, COOKIE_NAME } from '~/utils/auth';
import type { DocumentHead } from '@builder.io/qwik-city';
import { generateAdminClientHistoryPDF } from '~/utils/pdf-generator';

export const useClientData = routeLoader$(async ({ cookie, params, redirect }) => {
    // Auth check — admin only
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) throw redirect(302, '/');
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') throw redirect(302, '/');

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) throw redirect(302, '/admin');

    // Get client info
    const [client] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.id, clientId));

    if (!client) throw redirect(302, '/admin');

    // Get client reports
    const clientReports = await db.select().from(reports).where(eq(reports.userId, clientId)).orderBy(desc(reports.createdAt));

    return { client, reports: clientReports };
});

export default component$(() => {
    const data = useClientData();
    const checklists = useContext(ChecklistContext);
    const nav = useNavigate();
    const { client, reports } = data.value;

    const formatDate = (d: string | null) => {
        if (!d) return 'N/A';
        return new Date(d.replace(' ', 'T')).toLocaleString('es-ES', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleExportPDF = $((client: any, reports: any[]) => {
        generateAdminClientHistoryPDF(client, reports);
    });

    return (
        <div class="max-w-6xl mx-auto p-6 mt-8">
            <div class="mb-4">
                <button onClick$={() => nav('/admin')} class="text-primary hover:underline text-sm flex items-center gap-1">
                    <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd" /></svg>
                    Volver al Panel
                </button>
            </div>
            
            <div class="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h1 class="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Historial del Cliente
                    </h1>
                    <p class="opacity-60 mt-1 pb-1 border-b border-gray-800">
                        <span class="font-bold text-lg text-white">{client.name}</span> ({client.email})
                    </p>
                    <p class="text-sm opacity-50 mt-2">Registrado el: {formatDate(client.createdAt)}</p>
                </div>
                <button 
                  onClick$={() => handleExportPDF(client, reports)}
                  class="btn btn-outline btn-primary shadow-lg shadow-cyan-500/10 gap-2"
                  disabled={reports.length === 0}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Generar Historial PDF
                </button>
            </div>

            <div class="mb-8">
                <MaturityTrend 
                    reports={reports as any} 
                    sections={checklists?.value || []} 
                    showFilter={false} 
                />
            </div>


            <div class="bg-front rounded-xl border border-gray-800/50 shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-6 text-primary border-b border-gray-800 pb-2">Línea de Tiempo de Checklist</h2>
                
                {reports.length === 0 ? (
                    <p class="text-center py-8 opacity-50 italic">El cliente aún no ha completado ningún reporte.</p>
                ) : (
                    <div class="relative overflow-hidden pl-4 sm:pl-8">
                        {/* Vertical line */}
                        <div class="absolute top-0 bottom-0 left-[15px] sm:left-[31px] w-0.5 bg-gray-800"></div>
                        
                        <div class="flex flex-col gap-8">
                            {reports.map((report, idx) => (
                                <div key={report.id} class="relative pl-10 sm:pl-16 group">
                                    {/* Timeline dot */}
                                    <div class={`absolute top-1.5 left-0 w-8 h-8 rounded-full border-4 border-front flex items-center justify-center -translate-x-[20%] sm:-translate-x-1/2 shadow-lg transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-cyan-500 shadow-cyan-500/40' : 'bg-gray-600'}`}>
                                        {idx === 0 && <div class="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    
                                    <div class="bg-gray-800/20 hover:bg-gray-800/40 rounded-xl p-5 border border-gray-700/50 transition-colors">
                                        <div class="flex flex-col sm:flex-row justify-between mb-3 gap-2">
                                            <div>
                                                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                                    Evaluación {reports.length - idx}
                                                    {idx === 0 && <span class="badge badge-primary badge-sm">Último</span>}
                                                </h3>
                                                <p class="text-sm opacity-60 text-cyan-400">{formatDate(report.createdAt)}</p>
                                            </div>
                                            <div class="flex flex-col items-end">
                                                <div class="flex items-center gap-2">
                                                    <span class={`text-xl font-bold ${report.score >= 70 ? 'text-green-400' : report.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{report.score}%</span>
                                                </div>
                                                <p class="text-xs opacity-50">{report.completedCount} / {report.totalCount} ítems</p>
                                            </div>
                                        </div>
                                        
                                        <div class="w-full bg-gray-900 rounded-full h-2">
                                            <div class={`bg-gradient-to-r h-2 rounded-full ${report.score >= 70 ? 'from-green-500 to-green-400' : report.score >= 40 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400'}`} style={{ width: `${report.score}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export const head: DocumentHead = {
    title: 'Detalle de Cliente — CyberMetrik',
};
