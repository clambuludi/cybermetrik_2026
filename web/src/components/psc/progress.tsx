import { $, component$, useComputed$, useContext, useSignal } from '@builder.io/qwik';
import { ChecklistContext } from '~/store/checklist-context';
import { UserContext } from '~/store/user-context';
import { ProgressContext } from '~/store/progress-context';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import Icon from '~/components/core/icon';
import { generatePDF } from "~/utils/pdf-generator";
import WelcomeModal from '~/components/psc/welcome-modal';
import type { Sections } from '~/types/PSC';

interface ProgressProps {
  saveAction: any;
  clearHistoryAction?: any;
  setUserNameProp: any;
  hasHistoryServer?: boolean;
}

export default component$((props: ProgressProps) => {
  const checklists = useContext(ChecklistContext);
  const { user: currentUser } = useContext(UserContext);
  const progress = useContext(ProgressContext);
  const [userName, setUserName] = useLocalStorage('PSC_USER_NAME', '');
  const [isWelcomeDismissed, setIsWelcomeDismissed] = useLocalStorage('PSC_WELCOME_DISMISSED', false);
  const showToast = useSignal(false);

  // Compute total progress from the shared ProgressContext (reactive)
  const totalProgress = useComputed$(() => {
    const sections: Sections = (checklists as any)?.value || [];
    if (!Array.isArray(sections)) return { completed: 0, outOf: 0 };
    let total = 0;
    let done = 0;
    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    for (const section of sections) {
      if (!section?.checklist) continue;
      for (const item of section.checklist) {
        if (!item?.point) continue;
        const itemId = generateId(item.point);
        total++;
        if (progress.completed[itemId]) done++;
      }
    }
    return { completed: done, outOf: total };
  });

  const handleSave = $(async (finalize: boolean = false) => {
    const currentName = currentUser?.name || (userName as any).value || 'Invitado';
    const sections = (checklists as any)?.value || [];
    let total = 0;
    let done = 0;
    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    if (Array.isArray(sections)) {
      for (const section of sections) {
        if (!section?.checklist) continue;
        for (const item of section.checklist) {
          if (!item?.point) continue;
          const itemId = generateId(item.point);
          total++;
          if (progress.completed[itemId]) done++;
        }
      }
    }
    const currentScore = Math.round((done / (total || 1)) * 100);

    if (finalize) {
        await generatePDF({
            userName: currentName,
            sections,
            checkedItems: { ...progress.completed },
            totalProgress: { completed: done, outOf: total }
        });
    }

    await props.saveAction.submit({
        userName: currentName,
        score: currentScore,
        completedCount: done,
        totalCount: total,
        checkedItems: { ...progress.completed },
        ignoredItems: { ...progress.ignored },
        finalize
    });

    if (!finalize) {
        showToast.value = true;
        setTimeout(() => showToast.value = false, 3000);
    }
  });

  return (
    <div class="mt-8 flex flex-col items-center">
      {/* Success Toast */}
      {showToast.value && (
        <div class="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
            <div class="bg-blue-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-blue-400/30">
                <div class="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-blue-600" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <span class="font-bold tracking-wide">¡Guardado con éxito!</span>
            </div>
        </div>
      )}
      <div class="w-full max-w-4xl p-6 bg-front rounded-box shadow-lg border border-gray-800/50">
        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex-1 text-center md:text-left">
            <h2 class="text-3xl font-bold text-primary mb-2">Tu Progreso de Seguridad</h2>
            <p class="opacity-70 mb-4">
              Hola, <span class="font-bold text-secondary">
                {currentUser?.name || (userName as any).value || 'Invitado'}
              </span>.
              Has completado <span class="text-primary font-bold">{totalProgress.value.completed}</span> de <span class="font-bold">{totalProgress.value.outOf}</span> recomendaciones.
              <button onClick$={() => setIsWelcomeDismissed(false)} class="ml-2 text-xs text-primary hover:underline">
                (Cambiar Nombre)
              </button>
            </p>

            <div class="flex items-center gap-4 mb-6">
              <div class="flex-1">
                <progress class="progress progress-primary w-full h-4" value={totalProgress.value.completed} max={totalProgress.value.outOf || 1}></progress>
              </div>
              <span class="text-2xl font-black text-primary">
                {Math.round((totalProgress.value.completed / (totalProgress.value.outOf || 1)) * 100)}%
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button class="btn btn-primary text-white" onClick$={() => handleSave(true)}>
                <Icon icon="download" width={20} height={20} /> Finalizar y Descargar
              </button>
              <button class="btn btn-outline btn-secondary" onClick$={() => handleSave(false)}>
                <Icon icon="save" width={20} height={20} /> Guardar Progreso
              </button>
            </div>
          </div>
        </div>
      </div>

      <WelcomeModal
        isOpen={!currentUser && !(userName as any).value && !(isWelcomeDismissed as any).value}
        onSubmit={$(async (name: string) => {
          await setUserName(name);
          await setIsWelcomeDismissed(true);
        })}
      />
    </div>
  );
});
