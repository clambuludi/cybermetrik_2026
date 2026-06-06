import { useTask$, useContext, useVisibleTask$ } from '@builder.io/qwik';
import { UserContext } from '~/store/user-context';
import { ChecklistContext } from '~/store/checklist-context';
import { ProgressContext } from '~/store/progress-context';
import { useSaveReport } from '~/routes/api/report';
import { calcularMadurezBloque, calcularPuntajesConsistentes, type ItemEvaluacion } from '~/utils/madurez';
import { translateKeys } from '~/utils/key-translator';

export function useChecklistSync(hasHistory: boolean = false, latestData?: string, latestPartialDecimals?: string | null) {
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
        track(() => latestPartialDecimals);
        track(() => hasHistory);

        const currentUserId = currentUser?.userId?.toString() || 'guest';
        const syncedUserId = sessionStorage.getItem('PSC_SYNCED_USER');
        const schemaVersion = 'v2';
        const localSchemaVersion = localStorage.getItem('PSC_SCHEMA_VERSION');

        console.log(`[SYNC] Hydration check. User: ${currentUserId}, Synced: ${syncedUserId}, hasHistory: ${hasHistory}`);

        // SSR recreates the store as {} on every server render.
        // When the user session is active, always restore from localStorage (fast path)
        // instead of skipping — this repopulates the store after any page navigation/refresh.
        if (syncedUserId === currentUserId && localSchemaVersion === schemaVersion) {
            console.log('[SYNC] Session active. Restoring from localStorage (fast path).');
            try {
                const stored = localStorage.getItem('PSC_PROGRESS');
                const storedPartial = localStorage.getItem('PSC_PARTIAL_DECIMAL');
                const storedIgnored = localStorage.getItem('PSC_IGNORED');
                const storedEvidence = localStorage.getItem('PSC_EVIDENCE');
                const storedJustifications = localStorage.getItem('PSC_JUSTIFICATIONS');
                if (stored) {
                    const parsed = translateKeys(JSON.parse(stored));
                    const restored: Record<string, number | boolean> = {};
                    for (const [k, v] of Object.entries(parsed)) restored[k] = typeof v === 'number' ? v : Boolean(v);
                    progress.completed = restored;
                }
                if (storedPartial) {
                    try { progress.progresoParcialDecimal = translateKeys(JSON.parse(storedPartial)); } catch (_) { /* ignore */ }
                } else {
                    const newPartial: Record<string, number> = {};
                    for (const [k, v] of Object.entries(progress.completed)) {
                        newPartial[k] = typeof v === 'boolean' ? (v ? 1.0 : 0.0) : (v ?? 0.0);
                    }
                    progress.progresoParcialDecimal = newPartial;
                }
                if (storedIgnored) {
                    const parsedIgnored = translateKeys(JSON.parse(storedIgnored));
                    const restoredIgnored: Record<string, boolean> = {};
                    for (const [k, v] of Object.entries(parsedIgnored)) restoredIgnored[k] = Boolean(v);
                    progress.ignored = restoredIgnored;
                }
                if (storedEvidence) {
                    try { progress.evidenceLinks = translateKeys(JSON.parse(storedEvidence)); } catch (_) { /* ignore */ }
                }
                if (storedJustifications) {
                    try { progress.justifications = translateKeys(JSON.parse(storedJustifications)); } catch (_) { /* ignore */ }
                }
            } catch (_) { /* ignore */ }
            progress.isReady = true;
            return;
        }

        if (currentUser) {
            if (hasHistory && latestData) {
                try {
                    const parsed = translateKeys(JSON.parse(latestData));
                    const serverChecked = parsed.checkedItems || parsed;
                    const serverIgnored = parsed.ignoredItems || {};
                    const serverEvidence = parsed.evidenceLinks || {};
                    const serverJustifications = parsed.justifications || {};

                    // FIX: Iterate and assign each key individually so Qwik's
                    // store proxy detects the changes and triggers derived signals.
                    // Spreading into a new object reference alone is not enough when
                    // the store re-uses the same proxy slot.
                    const newCompleted: Record<string, number | boolean> = {};
                    for (const [k, v] of Object.entries(serverChecked)) {
                        newCompleted[k] = typeof v === 'number' ? v : Boolean(v);
                    }

                    let serverPartial: Record<string, number> = {};
                    if (latestPartialDecimals) {
                        try { serverPartial = translateKeys(JSON.parse(latestPartialDecimals)); } catch (_) { /* ignore */ }
                    } else if (parsed.progresoParcialDecimal) {
                        serverPartial = parsed.progresoParcialDecimal;
                    }
                    const newPartial: Record<string, number> = {};
                    for (const k of Object.keys(newCompleted)) {
                        const val = newCompleted[k];
                        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
                        newPartial[k] = serverPartial[k] !== undefined ? serverPartial[k] : numericVal;
                    }

                    const newIgnored: Record<string, boolean> = {};
                    for (const [k, v] of Object.entries(serverIgnored)) {
                        newIgnored[k] = Boolean(v);
                    }
                    const newEvidence: Record<string, string> = {};
                    for (const [k, v] of Object.entries(serverEvidence)) {
                        newEvidence[k] = String(v);
                    }
                    const newJustifications: Record<string, string> = {};
                    for (const [k, v] of Object.entries(serverJustifications)) {
                        newJustifications[k] = String(v);
                    }

                    progress.completed = newCompleted;
                    progress.progresoParcialDecimal = newPartial;
                    progress.ignored = newIgnored;
                    progress.evidenceLinks = newEvidence;
                    progress.justifications = newJustifications;

                    // Persist hydrated server state to localStorage so the next
                    // page refresh (before the server responds) shows the right state.
                    try {
                        localStorage.setItem('PSC_PROGRESS', JSON.stringify(newCompleted));
                        localStorage.setItem('PSC_PARTIAL_DECIMAL', JSON.stringify(newPartial));
                        localStorage.setItem('PSC_IGNORED', JSON.stringify(newIgnored));
                        localStorage.setItem('PSC_EVIDENCE', JSON.stringify(newEvidence));
                        localStorage.setItem('PSC_JUSTIFICATIONS', JSON.stringify(newJustifications));
                        localStorage.setItem('PSC_SCHEMA_VERSION', schemaVersion);
                    } catch (_) { /* ignore */ }

                    console.log(`[SYNC] Hydrated from server. Checked items: ${Object.keys(newCompleted).filter(k => newCompleted[k]).length}`);
                } catch (e) {
                    console.error('[SYNC] Hydration from server failed:', e);
                }
            } else {
                // New user with no history — purge any stale guest data
                console.log('[SYNC] New user or no history. Clearing local residue.');
                progress.completed = {};
                progress.progresoParcialDecimal = {};
                progress.ignored = {};
                progress.evidenceLinks = {};
                progress.justifications = {};
                try {
                    localStorage.removeItem('PSC_PROGRESS');
                    localStorage.removeItem('PSC_PARTIAL_DECIMAL');
                    localStorage.removeItem('PSC_IGNORED');
                    localStorage.removeItem('PSC_EVIDENCE');
                    localStorage.removeItem('PSC_JUSTIFICATIONS');
                } catch (_) { /* ignore */ }
            }
        } else {
            // Guest user
            if (syncedUserId && syncedUserId !== 'guest') {
                // User just logged out — clear their data
                console.log('[SYNC] Logout detected. Resetting guest state.');
                progress.completed = {};
                progress.progresoParcialDecimal = {};
                progress.ignored = {};
                progress.evidenceLinks = {};
                progress.justifications = {};
                try {
                    localStorage.removeItem('PSC_PROGRESS');
                    localStorage.removeItem('PSC_PARTIAL_DECIMAL');
                    localStorage.removeItem('PSC_IGNORED');
                    localStorage.removeItem('PSC_EVIDENCE');
                    localStorage.removeItem('PSC_JUSTIFICATIONS');
                } catch (_) { /* ignore */ }
            } else {
                // Returning guest — restore from localStorage
                try {
                    const stored = localStorage.getItem('PSC_PROGRESS');
                    const storedPartial = localStorage.getItem('PSC_PARTIAL_DECIMAL');
                    const storedIgnored = localStorage.getItem('PSC_IGNORED');
                    const storedEvidence = localStorage.getItem('PSC_EVIDENCE');
                    const storedJustifications = localStorage.getItem('PSC_JUSTIFICATIONS');

                    if (stored) {
                        const parsed = translateKeys(JSON.parse(stored));
                        const restored: Record<string, number | boolean> = {};
                        for (const [k, v] of Object.entries(parsed)) {
                            restored[k] = typeof v === 'number' ? v : Boolean(v);
                        }
                        progress.completed = restored;
                    }

                    if (storedPartial) {
                        try { progress.progresoParcialDecimal = translateKeys(JSON.parse(storedPartial)); } catch (_) { /* ignore */ }
                    } else {
                        const newPartial: Record<string, number> = {};
                        for (const [k, v] of Object.entries(progress.completed)) {
                            newPartial[k] = typeof v === 'boolean' ? (v ? 1.0 : 0.0) : (v ?? 0.0);
                        }
                        progress.progresoParcialDecimal = newPartial;
                    }

                    if (storedIgnored) {
                        const parsedIgnored = translateKeys(JSON.parse(storedIgnored));
                        const restoredIgnored: Record<string, boolean> = {};
                        for (const [k, v] of Object.entries(parsedIgnored)) {
                            restoredIgnored[k] = Boolean(v);
                        }
                        progress.ignored = restoredIgnored;
                    }

                    if (storedEvidence) {
                        try { progress.evidenceLinks = translateKeys(JSON.parse(storedEvidence)); } catch (_) { /* ignore */ }
                    }
                    if (storedJustifications) {
                        try { progress.justifications = translateKeys(JSON.parse(storedJustifications)); } catch (_) { /* ignore */ }
                    }

                    console.log('[SYNC] Guest restored from local storage.');
                } catch (_) { /* ignore */ }
            }
        }

        sessionStorage.setItem('PSC_SYNCED_USER', currentUserId);
        try {
            localStorage.setItem('PSC_SCHEMA_VERSION', schemaVersion);
        } catch (_) { /* ignore */ }
        progress.isReady = true;
    });

    // Auto-save: debounced, fires whenever progress.completed, ignored or progresoParcialDecimal changes.
    useTask$(async ({ track, cleanup }) => {
        // Track individual primitive counts so Qwik properly detects deep changes.
        const completedKeys = track(() => Object.keys(progress.completed).length);
        const ignoredKeys = track(() => Object.keys(progress.ignored).length);
        const completedValues = track(() =>
            Object.values(progress.completed).reduce((sum: number, val) => sum + (typeof val === 'number' ? val : (val ? 1 : 0)), 0)
        );
        track(() => Object.keys(progress.progresoParcialDecimal || {}).length);
        track(() => Object.values(progress.progresoParcialDecimal || {}).reduce((sum, v) => sum + v, 0));
        track(() => Object.keys(progress.evidenceLinks || {}).length);
        track(() => Object.keys(progress.justifications || {}).length);
        track(() => progress.isReady);

        // SSR guard
        if (typeof window === 'undefined') return;

        console.log(`[SYNC] Save task triggered. isReady: ${progress.isReady}, checked: ${completedValues}/${completedKeys}, ignored: ${ignoredKeys}`);

        if (!progress.isReady) return;

        // Always persist to localStorage immediately (for offline & guests)
        try {
            localStorage.setItem('PSC_PROGRESS', JSON.stringify(progress.completed));
            localStorage.setItem('PSC_PARTIAL_DECIMAL', JSON.stringify(progress.progresoParcialDecimal || {}));
            localStorage.setItem('PSC_IGNORED', JSON.stringify(progress.ignored));
            localStorage.setItem('PSC_EVIDENCE', JSON.stringify(progress.evidenceLinks || {}));
            localStorage.setItem('PSC_JUSTIFICATIONS', JSON.stringify(progress.justifications || {}));
            localStorage.setItem('PSC_SCHEMA_VERSION', 'v2');
        } catch (_) { /* ignore */ }

        // Only send to server if authenticated
        if (!currentUser) return;

        const timeout = setTimeout(async () => {
            progress.isSyncing = true;
            try {
                const generateId = (t: string) =>
                    t.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
                const sections = checklists.value || [];
                const itemsEvaluacion: ItemEvaluacion[] = [];

                if (Array.isArray(sections)) {
                    for (const section of sections) {
                        if (!section?.checklist) continue;
                        for (const item of section.checklist) {
                            if (!item?.point) continue;
                            const id = generateId(item.point);
                             const completedVal = progress.completed[id];
                             const numericVal = typeof completedVal === 'boolean' 
                               ? (completedVal ? 1.0 : 0.0) 
                               : (completedVal ?? 0.0);
                             const opcion = progress.ignored[id] ? "N/A" : numericVal;
                             
                             itemsEvaluacion.push({
                                 id,
                                 opcion_seleccionada: opcion,
                                 progreso_parcial_decimal: progress.progresoParcialDecimal?.[id] || null,
                                 drive_link: progress.evidenceLinks?.[id] || null
                             });
                        }
                    }
                }
                
                const { isoScore, egsiScore, clausesScore } = calcularPuntajesConsistentes(sections, progress);
                const score = Math.round(isoScore);
                
                let total = 0;
                let done = 0;
                const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

                for (const section of sections) {
                    if (!section?.checklist) continue;

                    const isClausesSection = section.title === 'Cláusulas ISO 27001';

                    if (isClausesSection) {
                        total += 28;
                        section.checklist.forEach(item => {
                            const idNorma = (item as any).id_norma;
                            if (typeof idNorma === 'string' && idNorma.trim() !== '') {
                                const match = idNorma.trim().match(SUB_ITEM_REGEX);
                                if (match) {
                                    const itemId = generateId(item.point);
                                    if (!progress.ignored[itemId]) {
                                        const baseVal = progress.completed[itemId];
                                        const numericVal = typeof baseVal === 'boolean' ? (baseVal ? 1.0 : 0.0) : (baseVal ?? 0.0);
                                        const partialVal = progress.progresoParcialDecimal?.[itemId];
                                        const pValue = partialVal !== undefined && partialVal !== null
                                            ? Number(partialVal)
                                            : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
                                        const hasDriveLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';

                                        if (numericVal === 1.0 || numericVal === 0.5) {
                                            if (hasDriveLink) {
                                                done += pValue;
                                            } else {
                                                done += pValue * 0.4;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    } else {
                        const parentIdsWithChildren = new Set<string>();
                        section.checklist.forEach(item => {
                            const idNorma = (item as any).id_norma;
                            if (typeof idNorma === 'string' && idNorma.trim() !== '') {
                                const match = idNorma.trim().match(SUB_ITEM_REGEX);
                                if (match) {
                                    parentIdsWithChildren.add(match[1]);
                                }
                            }
                        });

                        section.checklist.forEach(item => {
                            const idNorma = (item as any).id_norma?.trim() || '';
                            const isParent = idNorma && parentIdsWithChildren.has(idNorma);
                            if (isParent) return;

                            const itemId = generateId(item.point);
                            if (!progress.ignored[itemId]) {
                                total++;
                                const baseVal = progress.completed[itemId];
                                const numericVal = typeof baseVal === 'boolean' ? (baseVal ? 1.0 : 0.0) : (baseVal ?? 0.0);
                                const partialVal = progress.progresoParcialDecimal?.[itemId];
                                const pValue = partialVal !== undefined && partialVal !== null
                                    ? Number(partialVal)
                                    : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
                                done += pValue;
                            }
                        });
                    }
                }
                
                done = Number(done.toFixed(2));

                console.log(`[SYNC] Sending to server. ISO Score: ${isoScore}%, EGSI Score: ${egsiScore}%, Clauses Score: ${clausesScore}%`);

                await saveAction.submit({
                    userName: currentUser.name || 'Usuario',
                    score,
                    completedCount: done,
                    totalCount: total,
                    checkedItems: { ...progress.completed },
                    progresoParcialDecimal: { ...progress.progresoParcialDecimal },
                    ignoredItems: { ...progress.ignored },
                    evidenceLinks: { ...(progress.evidenceLinks || {}) },
                    justifications: { ...(progress.justifications || {}) },
                    finalize: false,
                    isoScore,
                    egsiScore,
                    clausesScore
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
