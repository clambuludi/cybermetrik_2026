import { component$, useContextProvider, useStore, Slot } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";
import jsyaml from "js-yaml";
import Database from 'better-sqlite3';
import path from 'path';

import Navbar from "~/components/furniture/nav";
import Footer from "~/components/furniture/footer";
import AuthModal from "~/components/auth/auth-modal";
import { ChecklistContext } from "~/store/checklist-context";
import { ProgressContext, type ProgressState } from "~/store/progress-context";
import { UserContext, type UserContextType } from "~/store/user-context";
import { verifyToken, COOKIE_NAME } from "~/utils/auth";
import type { Sections } from "~/types/PSC";
import { useChecklistSync } from "~/hooks/useChecklistSync";
import { useSaveReport } from "~/routes/api/report";

import { db } from "~/db";
import { appConfig, reports } from "~/db/schema";
import { desc, eq } from "drizzle-orm";

export const useChecklists = routeLoader$(async () => {
  const rawSections: Sections = [];
  try {
    // Resolvemos la ruta a la base de datos de tus controles migrados
    // process.cwd() suele apuntar por defecto a la carpeta web cuando corres el server de vite
    const dbPath = path.resolve(process.cwd(), '../instance/cybermetrik.db');
    const sqlite = new Database(dbPath, { readonly: true });
    
    // Obtenemos todos los controles que fijamos como activos
    const rows = sqlite.prepare(`SELECT * FROM preguntas WHERE activo = 1`).all() as any[];
    sqlite.close();

    // Agrupamos las preguntas por dominio para formar las secciones
    const grouped = rows.reduce((acc, row) => {
      let dom = row.dominio;
      
      // Filtrado por ID: si el dominio está vacío o es un fallback genérico, usamos el prefijo del id_norma
      if (!dom || dom === 'Dominio General' || dom.trim() === '') {
        const id_norma = (row.id_norma || '').toString();
        if (id_norma.startsWith('5.')) {
          dom = 'Dominio 5: Organizacional';
        } else if (id_norma.startsWith('6.')) {
          dom = 'Dominio 6: Personas';
        } else if (id_norma.startsWith('7.')) {
          dom = 'Dominio 7: Físico';
        } else if (id_norma.startsWith('8.')) {
          dom = 'Dominio 8: Tecnológico';
        } else {
          dom = 'Cláusulas ISO 27001';
        }
      }

      if (!acc[dom]) acc[dom] = [];
      acc[dom].push({
        point: row.pregunta,
        priority: 'essential',
        id_norma: row.id_norma,
        id_dominio_egsi: row.id_dominio_egsi,
        peso_gpr: row.peso_gpr,
        details: `Norma ISO: ${row.id_norma || '-'} | Control: ${row.tipo_control || 'N/A'}`
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Mapeamos los dominios al formato que el frontend espera (Section[])
    for (const [dom, items] of Object.entries(grouped) as [string, any[]][]) {
      rawSections.push({
        title: dom,
        slug: dom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: `Controles de seguridad requeridos para: ${dom}`,
        intro: 'Verifica y cumple con estos controles.',
        icon: '🛡️',
        color: 'blue',
        checklist: items,
        hidden: false
      });
    }

  } catch (e) {
    console.error("Error cargando el checklist ISO desde sqlite:", e);
    return [];
  }

  return rawSections;
});

export const useCurrentUser = routeLoader$(async ({ cookie }) => {
  const token = cookie.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
});

// Load the most recent saved report so useChecklistSync can hydrate from server on any route.
export const useLayoutReportHistory = routeLoader$(async ({ cookie }) => {
  const token = cookie.get(COOKIE_NAME)?.value;
  const user = token ? verifyToken(token) : null;
  if (!user) return null;
  try {
    const result = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, user.userId))
      .orderBy(desc(reports.createdAt))
      .limit(1);
    return result[0] ?? null;
  } catch {
    return null;
  }
});

export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

export default component$(() => {
  const checklists = useChecklists();
  const currentUser = useCurrentUser();
  const latestReport = useLayoutReportHistory();

  // Global progress state shared by ALL components (checklist-table, progress bar, etc.)
  const progressState = useStore<ProgressState>({
    completed: {},
    progresoParcialDecimal: {},
    ignored: {},
    evidenceLinks: {},
    justifications: {},
    isReady: false,
    isSyncing: false,
  });

  useContextProvider(ChecklistContext, checklists);
  useContextProvider(UserContext, { user: currentUser.value } satisfies UserContextType);
  useContextProvider(ProgressContext, progressState);

  // Sync lives in the layout so it persists across ALL client-side route changes.
  const hasHistory = !!latestReport.value;
  const latestData = latestReport.value?.data;
  const latestPartialDecimals = latestReport.value?.progresoParcialDecimal;
  useChecklistSync(hasHistory, latestData, latestPartialDecimals);
  // useSaveReport must be called here (same component) so the action is in scope for the hook.
  useSaveReport();

  const isLoggedIn = !!currentUser.value;

  return (
    <>
      <Navbar />
      <main class="bg-base-100 min-h-full">
        {isLoggedIn ? (
          <Slot />
        ) : (
          <>
            {/* Blurred content behind the modal */}
            <div class="filter blur-sm pointer-events-none select-none opacity-40">
              <Slot />
            </div>
            <AuthModal />
          </>
        )}
      </main>
      <Footer />
    </>
  );
});
