import { $, useStore, useOnWindow } from '@builder.io/qwik';
import type { Sections } from '~/types/PSC';

export const useChecklist = () => {
  const state = useStore<{ checklist: Sections | null }>({ checklist: null });

  useOnWindow('load', $(() => {
    // No-op, using context.
  }));

  const setChecklist = $((newChecklist: Sections) => {
    state.checklist = newChecklist;
  });

  return { checklist: state, setChecklist };
};
