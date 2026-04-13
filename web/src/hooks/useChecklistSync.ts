import { useTask$, useContext, useSignal } from '@builder.io/qwik';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { UserContext } from '~/store/user-context';
import { ChecklistContext } from '~/store/checklist-context';
import { useSaveReport } from '~/routes/api/report';

export function useChecklistSync() {
    const { user: currentUser } = useContext(UserContext);
    const checklists = useContext(ChecklistContext);
    
    // Local storage stores
    const [completed, setCompleted$] = useLocalStorage('PSC_PROGRESS', {});
    const [ignored, setIgnored$] = useLocalStorage('PSC_IGNORED', {});
    const [userName] = useLocalStorage('PSC_USER_NAME', '');
    
    const saveAction = useSaveReport();
    const isSyncing = useSignal(false);
    
    // Track changes for debounced sync
    useTask$(async ({ track, cleanup }) => {
        track(() => completed.value);
        track(() => ignored.value);
        
        // Only sync if user is logged in
        if (!currentUser) return;
        
        // Debounce for 2 seconds to avoid too many requests
        const timeout = setTimeout(async () => {
            isSyncing.value = true;
            try {
                // Calculate stats
                let total = 0;
                let done = 0;
                const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
                const sections = checklists.value || [];
                if (Array.isArray(sections)) {
                    for (const section of sections) {
                        if (!section?.checklist) continue;
                        for (const item of section.checklist) {
                            if (!item?.point) continue;
                            const itemId = generateId(item.point);
                            total++;
                            if (completed.value[itemId]) done++;
                        }
                    }
                }
                
                const currentScore = Math.round((done / (total || 1)) * 100);
                
                await saveAction.submit({
                    userName: currentUser?.name || (userName.value as string) || 'Usuario',
                    score: currentScore,
                    completedCount: done,
                    totalCount: total,
                    checkedItems: completed.value,
                    ignoredItems: ignored.value,
                    finalize: false
                });
                console.log('[SYNC] Progress saved to DB');
            } catch (e) {
                console.error('[SYNC] Failed to save progress:', e);
            } finally {
                isSyncing.value = false;
            }
        }, 2000);

        cleanup(() => clearTimeout(timeout));
    });
    
    return {
        completed,
        setCompleted$,
        ignored,
        setIgnored$,
        isSyncing
    };
}
