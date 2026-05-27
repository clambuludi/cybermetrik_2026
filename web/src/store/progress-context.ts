import { createContextId } from '@builder.io/qwik';

export interface ProgressState {
    completed: Record<string, number | boolean>;
    progresoParcialDecimal: Record<string, number>;
    ignored: Record<string, boolean>;
    evidenceLinks: Record<string, string>;
    justifications: Record<string, string>;
    isReady: boolean;
    isSyncing: boolean;
}

export const ProgressContext = createContextId<ProgressState>('psc.ProgressContext');
