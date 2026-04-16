import { component$, useContextProvider, useStore, Slot } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";
import jsyaml from "js-yaml";

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
  let rawSections: Sections = [];
  try {
    const config = await db.select().from(appConfig).where(eq(appConfig.key, 'global_checklist')).limit(1);
    if (config.length > 0) {
      rawSections = JSON.parse(config[0].value) as Sections;
    } else {
      const remoteUrl = 'https://raw.githubusercontent.com/Lissy93/personal-security-checklist/HEAD/personal-security-checklist.yml';
      const res = await fetch(remoteUrl);
      const text = await res.text();
      rawSections = jsyaml.load(text) as Sections;
    }
  } catch (e) {
    console.error("Error loading checklist config:", e);
    return [];
  }

  // Filter out hidden sections and questions
  return rawSections
    .filter(section => !section.hidden)
    .map(section => ({
      ...section,
      checklist: (section.checklist || []).filter(item => !item.hidden)
    }))
    .filter(section => section.checklist.length > 0); // Only show sections that have visible items
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
    ignored: {},
    isReady: false,
    isSyncing: false,
  });

  useContextProvider(ChecklistContext, checklists);
  useContextProvider(UserContext, { user: currentUser.value } satisfies UserContextType);
  useContextProvider(ProgressContext, progressState);

  // Sync lives in the layout so it persists across ALL client-side route changes.
  const hasHistory = !!latestReport.value;
  const latestData = latestReport.value?.data;
  useChecklistSync(hasHistory, latestData);
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
