import { useTask$, useContext, useVisibleTask$ } from '@builder.io/qwik';
import { UserContext } from '~/store/user-context';
import { ChecklistContext } from '~/store/checklist-context';
import { ProgressContext } from '~/store/progress-context';
import { useSaveReport } from '~/routes/api/report';

export function useChecklistSync(hasHistory: boolean = false, latestData?: string) {
    const { user: currentUser } = useContext(UserContext);
    const checklists = useContext(ChecklistContext);
    const progress = useContext(ProgressContext);
    const saveAction = useSaveReport();

    // Hydration: runs on the client after mount.
    // The DB is the ABSOLUTE source of truth for logged-in users.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(async ({ track }) => {
        track(() => currentUser);
        track(() => latestData);
        track(() => hasHistory);

        const currentUserId = currentUser?.userId?.toString() || 'guest';
        const syncedUserId = sessionStorage.getItem('PSC_SYNCED_USER');

        console.log(`[SYNC] Hydration check. User: ${currentUserId}, Synced: ${syncedUserId}, hasHistory: ${hasHistory}`);

        // SSR recreates the store as {} on every server render.
        // When the user session is active, always restore from localStorage (fast path)
        // instead of skipping — this repopulates the store after any page navigation/refresh.
        if (syncedUserId === currentUserId) {
            console.log('[SYNC] Session active. Restoring from localStorage (fast path).');
            try {
                const stored = localStorage.getItem('PSC_PROGRESS');
                const storedIgnored = localStorage.getItem('PSC_IGNORED');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const restored: Record<string, boolean> = {};
                    for (const [k, v] of Object.entries(parsed)) restored[k] = Boolean(v);
                    progress.completed = restored;
                }
                if (storedIgnored) {
                    const parsedIgnored = JSON.parse(storedIgnored);
                    const restoredIgnored: Record<string, boolean> = {};
                    for (const [k, v] of Object.entries(parsedIgnored)) restoredIgnored[k] = Boolean(v);
                    progress.ignored = restoredIgnored;
                }
            } catch (_) {}
            progress.isReady = true;
            return;
        }

        if (currentUser) {
            if (hasHistory && latestData) {
                try {
                    const parsed = JSON.parse(latestData);
                    const serverChecked = parsed.checkedItems || parsed;
                    const serverIgnored = parsed.ignoredItems || {};

                    // FIX: Iterate and assign each key individually so Qwik's
                    // store proxy detects the changes and triggers derived signals.
                    // Spreading into a new object reference alone is not enough when
                    // the store re-uses the same proxy slot.
                    const newCompleted: Record<string, boolean> = {};
                    for (const [k, v] of Object.entries(serverChecked)) {
                        newCompleted[k] = Boolean(v);
                    }
                    const newIgnored: Record<string, boolean> = {};
                    for (const [k, v] of Object.entries(serverIgnored)) {
                        newIgnored[k] = Boolean(v);
                    }

                    progress.completed = newCompleted;
                    progress.ignored = newIgnored;

                    // Persist hydrated server state to localStorage so the next
                    // page refresh (before the server responds) shows the right state.
                    try {
                        localStorage.setItem('PSC_PROGRESS', JSON.stringify(newCompleted));
                        localStorage.setItem('PSC_IGNORED', JSON.stringify(newIgnored));
                    } catch (_) {}

                    console.log(`[SYNC] Hydrated from server. Checked items: ${Object.keys(newCompleted).filter(k => newCompleted[k]).length}`);
                } catch (e) {
                    console.error('[SYNC] Hydration from server failed:', e);
                }
            } else {
                // New user with no history — purge any stale guest data
                console.log('[SYNC] New user or no history. Clearing local residue.');
                progress.completed = {};
                progress.ignored = {};
                try {
                    localStorage.removeItem('PSC_PROGRESS');
                    localStorage.removeItem('PSC_IGNORED');
                } catch (_) {}
            }
        } else {
            // Guest user
            if (syncedUserId && syncedUserId !== 'guest') {
                // User just logged out — clear their data
                console.log('[SYNC] Logout detected. Resetting guest state.');
                progress.completed = {};
                progress.ignored = {};
                try {
                    localStorage.removeItem('PSC_PROGRESS');
                    localStorage.removeItem('PSC_IGNORED');
                } catch (_) {}
            } else {
                // Returning guest — restore from localStorage
                try {
                    const stored = localStorage.getItem('PSC_PROGRESS');
                    const storedIgnored = localStorage.getItem('PSC_IGNORED');

                    if (stored) {
                        const parsed = JSON.parse(stored);
                        const restored: Record<string, boolean> = {};
                        for (const [k, v] of Object.entries(parsed)) {
                            restored[k] = Boolean(v);
                        }
                        progress.completed = restored;
                    }

                    if (storedIgnored) {
                        const parsedIgnored = JSON.parse(storedIgnored);
                        const restoredIgnored: Record<string, boolean> = {};
                        for (const [k, v] of Object.entries(parsedIgnored)) {
                            restoredIgnored[k] = Boolean(v);
                        }
                        progress.ignored = restoredIgnored;
                    }

                    console.log('[SYNC] Guest restored from local storage.');
                } catch (_) {}
            }
        }

        sessionStorage.setItem('PSC_SYNCED_USER', currentUserId);
        progress.isReady = true;
    });

    // Auto-save: debounced, fires whenever progress.completed or ignored changes.
    useTask$(async ({ track, cleanup }) => {
        // Track individual primitive counts so Qwik properly detects deep changes.
        // Tracking the object reference alone won't re-run when properties are added/removed.
        const completedKeys = track(() => Object.keys(progress.completed).length);
        const ignoredKeys = track(() => Object.keys(progress.ignored).length);
        const completedValues = track(() =>
            Object.values(progress.completed).filter(Boolean).length
        );
        track(() => progress.isReady);

        // SSR guard
        if (typeof window === 'undefined') return;

        console.log(`[SYNC] Save task triggered. isReady: ${progress.isReady}, checked: ${completedValues}/${completedKeys}, ignored: ${ignoredKeys}`);

        if (!progress.isReady) return;

        // Always persist to localStorage immediately (for offline & guests)
        try {
            localStorage.setItem('PSC_PROGRESS', JSON.stringify(progress.completed));
            localStorage.setItem('PSC_IGNORED', JSON.stringify(progress.ignored));
        } catch (_) {}

        // Only send to server if authenticated
        if (!currentUser) return;

        const timeout = setTimeout(async () => {
            progress.isSyncing = true;
            try {
                let total = 0;
                let done = 0;
                const generateId = (t: string) =>
                    t.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
                const sections = checklists.value || [];
                if (Array.isArray(sections)) {
                    for (const section of sections) {
                        if (!section?.checklist) continue;
                        for (const item of section.checklist) {
                            if (!item?.point) continue;
                            total++;
                            if (progress.completed[generateId(item.point)]) done++;
                        }
                    }
                }
                const score = Math.round((done / (total || 1)) * 100);
                console.log(`[SYNC] Sending to server. Score: ${score}%, Done: ${done}`);

                await saveAction.submit({
                    userName: currentUser.name || 'Usuario',
                    score,
                    completedCount: done,
                    totalCount: total,
                    checkedItems: { ...progress.completed },
                    ignoredItems: { ...progress.ignored },
                    finalize: false,
                });
                console.log(`[SYNC] Server save successful.`);
            } catch (e) {
                console.error('[SYNC] Server save failed:', e);
            } finally {
                progress.isSyncing = false;
            }
        }, 2000);

        cleanup(() => clearTimeout(timeout));
    });

    return { progress };
}
