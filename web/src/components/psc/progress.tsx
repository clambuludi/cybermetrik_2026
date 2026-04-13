import { $, component$, useComputed$, useContext } from '@builder.io/qwik';
import { ChecklistContext } from '~/store/checklist-context';
import { UserContext } from '~/store/user-context';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import Icon from '~/components/core/icon';
import { generatePDF } from "~/utils/pdf-generator";
import WelcomeModal from '~/components/psc/welcome-modal';
import type { Sections } from '~/types/PSC';

interface ProgressProps {
  saveAction: any;
  clearHistoryAction?: any;
  setUserNameProp: any;
}

export default component$((props: ProgressProps) => {
  const checklists = useContext(ChecklistContext);
  const { user: currentUser } = useContext(UserContext);
  const [userName, setUserName] = useLocalStorage('PSC_USER_NAME', '');
  const [checkedItems] = useLocalStorage('PSC_PROGRESS', {} as Record<string, boolean>);
  const [ignoredItems] = useLocalStorage('PSC_IGNORED', {} as Record<string, boolean>);
  const [isWelcomeDismissed, setIsWelcomeDismissed] = useLocalStorage('PSC_WELCOME_DISMISSED', false);

  const finalSetUserName = props.setUserNameProp || setUserName;

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
        if ((checkedItems as any).value?.[itemId]) done++;
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
          if ((checkedItems as any).value?.[itemId]) done++;
        }
      }
    }

    const currentScore = Math.round((done / (total || 1)) * 100);

    if (finalize) {
        await generatePDF({
            userName: currentName,
            sections,
            checkedItems: (checkedItems as any).value,
            totalProgress: { completed: done, outOf: total }
        });
    }

    await props.saveAction.submit({
        userName: currentName,
        score: currentScore,
        completedCount: done,
        totalCount: total,
        checkedItems: (checkedItems as any).value || {},
        ignoredItems: (ignoredItems as any).value || {},
        finalize
    });
  });

  return (
    <div class="mt-8 flex flex-col items-center">
      <div class="w-full max-w-4xl p-6 bg-front rounded-box shadow-lg border border-gray-800/50">
        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex-1 text-center md:text-left">
            <h2 class="text-3xl font-bold text-primary mb-2">Tu Progreso de Seguridad</h2>
            <p class="opacity-70 mb-4">
              Hola, <span class="font-bold text-secondary">
                {currentUser?.name || (userName as any).value || 'Invitado'}
              </span>.
              Has completado <span class="text-primary font-bold">{totalProgress.value.completed}</span> de <span class="font-bold">{totalProgress.value.outOf}</span> recomendaciones.
              <button
                onClick$={() => setIsWelcomeDismissed(false)}
                class="ml-2 text-xs text-primary hover:underline"
              >
                (Cambiar Nombre)
              </button>
            </p>

            <div class="flex items-center gap-4 mb-6">
              <div class="flex-1">
                <progress
                  class="progress progress-primary w-full h-4"
                  value={totalProgress.value.completed}
                  max={totalProgress.value.outOf || 1}
                ></progress>
              </div>
              <span class="text-2xl font-black text-primary">
                {Math.round((totalProgress.value.completed / (totalProgress.value.outOf || 1)) * 100)}%
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                class="btn btn-primary text-white"
                onClick$={() => handleSave(true)}
              >
                <Icon icon="download" width={20} height={20} />
                Finalizar y Descargar
              </button>
              <button
                class="btn btn-outline btn-secondary"
                onClick$={() => handleSave(false)}
              >
                <Icon icon="save" width={20} height={20} />
                Guardar Progreso
              </button>
              <button
                class="btn btn-outline btn-error"
                onClick$={async () => {
                  if (confirm('¿Estás seguro de que deseas reiniciar TODO tu progreso? Se borrará tu historial y tus respuestas actuales. Esta acción es definitiva.')) {
                    localStorage.removeItem('PSC_PROGRESS');
                    localStorage.removeItem('PSC_IGNORED');
                    
                    if (props.clearHistoryAction) {
                        await props.clearHistoryAction.submit();
                    }
                    
                    await finalSetUserName('');
                    location.reload();
                  }
                }}
              >
                <Icon icon="clear" width={20} height={20} />
                Reiniciar Todo
              </button>
            </div>
          </div>
        </div>
      </div>

      <WelcomeModal
        isOpen={!currentUser && !(userName as any).value && !(isWelcomeDismissed as any).value}
        onSubmit={$(async (name: string) => {
          await finalSetUserName(name);
          await setIsWelcomeDismissed(true);
        })}
      />
    </div>
  );
});
