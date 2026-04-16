import { component$, useContext } from '@builder.io/qwik';
import { type DocumentHead, routeLoader$ } from "@builder.io/qwik-city";

import Hero from "~/components/furniture/hero";
import SectionLinkGrid from "~/components/psc/section-link-grid";
import Progress from "~/components/psc/progress";
import MaturityTrend from '~/components/psc/maturity-trend';
import ReportHistory from '~/components/psc/report-history';
import { db } from '~/db';
import { reports } from '~/db/schema';
import { desc, eq } from 'drizzle-orm';
import { COOKIE_NAME, verifyToken } from '~/utils/auth';
import { ChecklistContext } from '~/store/checklist-context';
import { UserContext } from '~/store/user-context';
import { ProgressContext } from '~/store/progress-context';
import { useSaveReport, useClearHistory } from '~/routes/api/report';

export const useReportHistory = routeLoader$(async (event) => {
    const token = event.cookie.get(COOKIE_NAME)?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
        return [];
    }

    try {
        let query = db.select().from(reports);
        if (user.role !== 'admin') {
            query = query.where(eq(reports.userId, user.userId)) as any;
        }
        return await query.orderBy(desc(reports.createdAt));
    } catch (e) {
        console.error('Error loading reports:', e);
        return [];
    }
});

export default component$(() => {
    const checklists = useContext(ChecklistContext);
    const { user: currentUser } = useContext(UserContext);
    const progress = useContext(ProgressContext);
    const reportsData = useReportHistory();
    const saveAction = useSaveReport();
    const clearHistoryAction = useClearHistory();

    const hasHistory = !!(reportsData.value && reportsData.value.length > 0);
    const latestData = reportsData.value?.[0]?.data;

    // NOTE: useChecklistSync is now in layout.tsx so it stays active across all routes.
    // Do NOT call it here as well or it will double-hydrate.

    return (
        <>
            <Hero />
            {currentUser?.role !== 'admin' && (
                <Progress
                    saveAction={saveAction}
                    clearHistoryAction={clearHistoryAction}
                    setUserNameProp={null}
                    hasHistoryServer={hasHistory}
                />
            )}
            {currentUser?.role !== 'admin' ? (
                <SectionLinkGrid sections={
                    (Array.isArray(checklists?.value) ? checklists.value : []) as any
                } />
            ) : (
                <div class="mt-12 text-center">
                    <h2 class="text-2xl font-bold text-gray-300">Bienvenido al Panel Principal</h2>
                    <p class="mt-4 text-gray-400">Como administrador, puedes gestionar el contenido y ver los progresos desde tu panel.</p>
                    <a href="/admin" class="btn btn-primary mt-6">Ir al Panel de Administración</a>
                </div>
            )}
            {currentUser?.role !== 'admin' && (
                <div class="mt-8">
                    <MaturityTrend
                        reports={reportsData.value}
                        sections={checklists?.value || []}
                        showFilter={false}
                        currentProgress={progress.completed}
                    />
                    <ReportHistory 
                        reports={reportsData.value || []} 
                        sections={checklists?.value || []} 
                    />
                </div>
            )}
        </>
    );
});

export const head: DocumentHead = {
    title: "CyberMetrik - Personal Security Checklist",
    meta: [
        {
            name: "description",
            content: "A comprehensive checklist for personal security best practices.",
        },
    ],
};
