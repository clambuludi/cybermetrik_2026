import { component$, $, useVisibleTask$, useSignal } from '@builder.io/qwik';
import { routeLoader$, routeAction$, useNavigate, z, zod$ } from '@builder.io/qwik-city';
import { db } from '~/db';
import { reports, users } from '~/db/schema';
import { desc, eq } from 'drizzle-orm';
import { verifyToken, COOKIE_NAME } from '~/utils/auth';
import type { DocumentHead } from '@builder.io/qwik-city';
import { generateAdminSummaryPDF } from '~/utils/pdf-generator';

export const useAdminData = routeLoader$(async ({ cookie, redirect }) => {
  const token = cookie.get(COOKIE_NAME)?.value;
  if (!token) throw redirect(302, '/');
  const session = verifyToken(token);
  if (!session || session.role !== 'admin') throw redirect(302, '/');

  const allUsers = await db.select({
    id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt
  }).from(users).where(eq(users.role, 'client'));

  const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
  return { users: allUsers, reports: allReports };
});

export const useDeleteClient = routeAction$(async (data, { cookie }) => {
  const token = cookie.get(COOKIE_NAME)?.value;
  if (!token) return { success: false };
  const session = verifyToken(token);
  if (!session || session.role !== 'admin') return { success: false };
  try {
    await db.delete(reports).where(eq(reports.userId, data.userId));
    await db.delete(users).where(eq(users.id, data.userId));
    return { success: true };
  } catch (e) { return { success: false }; }
}, zod$({ userId: z.number() }));

// ── Maturity level config ───────────────────────────────────────────────────
const LEVELS = [
  { label: 'Crítico',    min: 0,  max: 20,  color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: '#ef444440', icon: '🔴' },
  { label: 'Básico',     min: 20, max: 40,  color: '#f97316', bg: 'rgba(249,115,22,0.15)',  border: '#f9731640', icon: '🟠' },
  { label: 'Moderado',   min: 40, max: 60,  color: '#eab308', bg: 'rgba(234,179,8,0.15)',   border: '#eab30840', icon: '🟡' },
  { label: 'Avanzado',   min: 60, max: 80,  color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   border: '#22c55e40', icon: '🟢' },
  { label: 'Óptimo',     min: 80, max: 101, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   border: '#06b6d440', icon: '🔵' },
];

function getLevel(score: number) {
  return LEVELS.find(l => score >= l.min && score < l.max) || LEVELS[0];
}

export default component$(() => {
  const data = useAdminData();
  const deleteAction = useDeleteClient();
  const nav = useNavigate();
  const chartRef = useSignal<HTMLCanvasElement | undefined>(undefined);
  const activeTab = useSignal<'chart' | 'table'>('chart');

  const { users: clients, reports: allReports } = data.value;

  const getLatestScore = (userId: number): number => {
    const rpts = allReports.filter(r => r.userId === userId);
    if (!rpts.length) return 0;
    const r = rpts[0];
    if (r.score === 0 && r.data) {
      try {
        const d = JSON.parse(r.data);
        const items = d.checkedItems || d;
        const done = Object.values(items).filter(Boolean).length;
        return Math.round((done / (r.totalCount || 259)) * 100);
      } catch { return 0; }
    }
    return r.score ?? 0;
  };

  const clientScores: Record<number, number> = {};
  clients.forEach(c => { clientScores[c.id] = getLatestScore(c.id); });

  const avgScore = clients.length
    ? Math.round(clients.reduce((s, c) => s + (clientScores[c.id] ?? 0), 0) / clients.length)
    : 0;

  const levelCounts = LEVELS.map(l => ({
    ...l,
    count: clients.filter(c => {
      const s = clientScores[c.id] ?? 0;
      return s >= l.min && s < l.max;
    }).length,
  }));

  // Sort clients by score descending for chart
  const sortedClients = [...clients].sort((a, b) => (clientScores[b.id] ?? 0) - (clientScores[a.id] ?? 0));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => clients.length);
    track(() => activeTab.value);

    if (activeTab.value !== 'chart') return;

    const canvas = chartRef.value || document.getElementById('maturityBarChart') as HTMLCanvasElement;
    if (!canvas || clients.length === 0) return;

    // Dynamically import Chart.js from CDN if not available
    const buildChart = () => {
      const Chart = (window as any).Chart;
      if (!Chart) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if ((window as any)._adminChart) (window as any)._adminChart.destroy();

      const scores = sortedClients.map(c => clientScores[c.id] ?? 0);
      const colors = scores.map(s => getLevel(s).color);
      const bgColors = scores.map(s => getLevel(s).color + 'cc');

      (window as any)._adminChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedClients.map(c => c.name),
          datasets: [{
            label: 'Nivel de Madurez (%)',
            data: scores,
            backgroundColor: bgColors,
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 10,
            borderSkipped: false,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e2433',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: (ctx: any) => {
                  const score = ctx.parsed.y;
                  const lvl = getLevel(score);
                  return ` ${score}% — ${lvl.icon} ${lvl.label}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                color: 'rgba(255,255,255,0.5)',
                callback: (v: any) => v + '%'
              },
              grid: { color: 'rgba(255,255,255,0.06)' },
              border: { color: 'transparent' }
            },
            x: {
              ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 12 } },
              grid: { display: false },
              border: { color: 'transparent' }
            }
          }
        }
      });
    };

    if ((window as any).Chart) {
      buildChart();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      script.onload = buildChart;
      document.head.appendChild(script);
    }
  });

  return (
    <div class="max-w-7xl mx-auto px-4 py-8">

      {/* ── Header ─────────────────────────────────────── */}
      <div class="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 class="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Panel de Administración
          </h1>
          <p class="opacity-50 mt-1 text-sm">Monitoreo de madurez de seguridad — {clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick$={$(() => generateAdminSummaryPDF(clients, allReports, clientScores))}
            class="btn btn-outline btn-primary shadow-lg shadow-cyan-500/10"
            disabled={clients.length === 0}
          >
            📄 Reporte General
          </button>
          <a href="/admin/gestor" class="btn btn-primary shadow-lg shadow-cyan-500/20">
            ⚙️ Gestor de Preguntas
          </a>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────── */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div class="bg-front rounded-2xl p-5 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
          <p class="text-xs uppercase tracking-widest opacity-50 mb-1">Clientes</p>
          <p class="text-4xl font-black text-cyan-400">{clients.length}</p>
        </div>
        <div class="bg-front rounded-2xl p-5 border border-purple-500/20 shadow-lg shadow-purple-500/5">
          <p class="text-xs uppercase tracking-widest opacity-50 mb-1">Reportes</p>
          <p class="text-4xl font-black text-purple-400">{allReports.length}</p>
        </div>
        <div class="bg-front rounded-2xl p-5 border border-green-500/20 shadow-lg shadow-green-500/5">
          <p class="text-xs uppercase tracking-widest opacity-50 mb-1">Madurez Prom.</p>
          <p class="text-4xl font-black" style={`color: ${getLevel(avgScore).color}`}>{avgScore}%</p>
        </div>
        <div class="bg-front rounded-2xl p-5 border border-yellow-500/20 shadow-lg shadow-yellow-500/5">
          <p class="text-xs uppercase tracking-widest opacity-50 mb-1">Nivel Prom.</p>
          <p class="text-2xl font-black" style={`color: ${getLevel(avgScore).color}`}>
            {getLevel(avgScore).icon} {getLevel(avgScore).label}
          </p>
        </div>
      </div>

      {/* ── Level Distribution Pills ───────────────────── */}
      <div class="grid grid-cols-5 gap-3 mb-8">
        {levelCounts.map(l => (
          <div key={l.label}
            class="rounded-xl p-3 text-center border"
            style={`background: ${l.bg}; border-color: ${l.border}`}
          >
            <div class="text-xl mb-1">{l.icon}</div>
            <div class="text-xs opacity-60 mb-1">{l.label}</div>
            <div class="text-2xl font-black" style={`color: ${l.color}`}>{l.count}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div class="flex gap-2 mb-4">
        <button
          class={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab.value === 'chart' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'opacity-40 hover:opacity-70'}`}
          onClick$={() => { activeTab.value = 'chart'; }}
        >
          📊 Gráfico de Madurez
        </button>
        <button
          class={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab.value === 'table' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'opacity-40 hover:opacity-70'}`}
          onClick$={() => { activeTab.value = 'table'; }}
        >
          🧾 Tabla de Clientes
        </button>
      </div>

      {/* ── Bar Chart ─────────────────────────────────── */}
      {activeTab.value === 'chart' && (
        <div class="bg-front rounded-2xl border border-gray-800/50 shadow-xl p-6 mb-8">
          {clients.length === 0 ? (
            <div class="h-64 flex items-center justify-center opacity-30 text-lg">
              Sin clientes registrados aún.
            </div>
          ) : (
            <>
              {/* Legend */}
              <div class="flex flex-wrap gap-3 mb-6">
                {LEVELS.map(l => (
                  <span key={l.label} class="flex items-center gap-1.5 text-xs opacity-70">
                    <span class="w-3 h-3 rounded-full inline-block" style={`background:${l.color}`}></span>
                    {l.icon} {l.label} ({l.min}–{l.max === 101 ? 100 : l.max}%)
                  </span>
                ))}
              </div>
              {/* Chart */}
              <div style="height: 320px; position: relative;">
                <canvas id="maturityBarChart" ref={chartRef}></canvas>
              </div>
              {/* Benchmark line description */}
              <p class="text-xs opacity-30 mt-4 text-center">
                Clientes ordenados de mayor a menor madurez. Haz clic en una fila de la tabla para ver el detalle.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Client Table ──────────────────────────────── */}
      {activeTab.value === 'table' && (
        <div class="bg-front rounded-2xl border border-gray-800/50 shadow-xl p-6 mb-8">
          {clients.length === 0 ? (
            <div class="py-16 text-center opacity-30">Sin clientes registrados aún.</div>
          ) : (
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr class="text-xs uppercase tracking-widest opacity-40">
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Reportes</th>
                    <th>Madurez</th>
                    <th>Nivel</th>
                    <th class="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map(c => {
                    const score = clientScores[c.id] ?? 0;
                    const lvl = getLevel(score);
                    const numReports = allReports.filter(r => r.userId === c.id).length;
                    return (
                      <tr
                        key={c.id}
                        class="hover:bg-gray-800/30 cursor-pointer transition-colors"
                        onClick$={$(() => nav(`/admin/client/${c.id}`))}
                      >
                        <td class="font-bold">{c.name}</td>
                        <td class="opacity-60 text-sm">{c.email}</td>
                        <td class="opacity-60 text-sm">{numReports}</td>
                        <td>
                          <div class="flex items-center gap-2">
                            <div class="w-24 h-2 rounded-full bg-gray-700 overflow-hidden">
                              <div
                                class="h-full rounded-full transition-all"
                                style={`width: ${score}%; background: ${lvl.color}`}
                              ></div>
                            </div>
                            <span class="font-black text-sm" style={`color: ${lvl.color}`}>{score}%</span>
                          </div>
                        </td>
                        <td>
                          <span
                            class="px-3 py-1 rounded-full text-xs font-bold"
                            style={`background: ${lvl.bg}; color: ${lvl.color}; border: 1px solid ${lvl.border}`}
                          >
                            {lvl.icon} {lvl.label}
                          </span>
                        </td>
                        <td class="text-right">
                          <button
                            onClick$={$(async (e) => {
                              e.stopPropagation();
                              if (confirm(`¿Eliminar a ${c.name}? Esta acción es irreversible.`)) {
                                await deleteAction.submit({ userId: c.id });
                              }
                            })}
                            class="btn btn-ghost btn-sm text-error hover:bg-error/10"
                          >
                            ✕
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
      )}

    </div>
  );
});

export const head: DocumentHead = { title: 'Admin — CyberMetrik' };
