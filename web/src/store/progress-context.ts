import { createContextId } from '@builder.io/qwik';

export interface ProgressState {
    completed: Record<string, boolean>;
    ignored: Record<string, boolean>;
    isReady: boolean;
    isSyncing: boolean;
}

export const ProgressContext = createContextId<ProgressState>('psc.ProgressContext');
