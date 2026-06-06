import { $, component$, useComputed$, useContext, useSignal } from '@builder.io/qwik';
import { ChecklistContext } from '~/store/checklist-context';
import { UserContext } from '~/store/user-context';
import { ProgressContext } from '~/store/progress-context';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import Icon from '~/components/core/icon';
import { generatePDF } from "~/utils/pdf-generator";
import WelcomeModal from '~/components/psc/welcome-modal';
import type { Sections } from '~/types/PSC';
import { calcularPuntajesConsistentes } from '~/utils/madurez';

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
    return { completed: Number(done.toFixed(2)), outOf: total };
  });

  // Progreso general reactivo y específico de la ISO 27001 (excluyendo EGSI)
  const generalIsoCompleted = useComputed$(() => {
    const sections: Sections = (checklists as any)?.value || [];
    if (!Array.isArray(sections)) return 0;
    let done = 0;
    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

    for (const section of sections) {
      if (!section?.checklist) continue;
      const isClausesSection = section.title === 'Cláusulas ISO 27001';

      if (isClausesSection) {
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
        const isIsoSection = !section.title.includes('EGSI FASE');
        if (!isIsoSection) continue;

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
    return Number(done.toFixed(2));
  });

  // Cálculo reactivo de barras independientes ISO y EGSI (GPR)
  const stats = useComputed$(() => {
    const sections: Sections = (checklists as any)?.value || [];
    return calcularPuntajesConsistentes(sections, progress);
  });

  const highPrecisionIsoScore = useComputed$(() => {
    return (stats.value as any).generalIsoScore ?? 0;
  });

  const handleSave = $(async (finalize: boolean = false) => {
    const currentName = currentUser?.name || (userName as any).value || 'Invitado';
    const sections = (checklists as any)?.value || [];
    let total = 0;
    let done = 0;
    let isoDone = 0;
    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

    if (Array.isArray(sections)) {
      for (const section of sections) {
        if (!section?.checklist) continue;

        const isClausesSection = section.title === 'Cláusulas ISO 27001';

        if (isClausesSection) {
          total += 28;
          section.checklist.forEach((item: any) => {
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
                      isoDone += pValue;
                    } else {
                      done += pValue * 0.4;
                      isoDone += pValue * 0.4;
                    }
                  }
                }
              }
            }
          });
        } else {
          const isIsoSection = !section.title.includes('EGSI FASE');
          const parentIdsWithChildren = new Set<string>();
          section.checklist.forEach((item: any) => {
            const idNorma = (item as any).id_norma;
            if (typeof idNorma === 'string' && idNorma.trim() !== '') {
              const match = idNorma.trim().match(SUB_ITEM_REGEX);
              if (match) {
                parentIdsWithChildren.add(match[1]);
              }
            }
          });

          section.checklist.forEach((item: any) => {
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
              if (isIsoSection) {
                isoDone += pValue;
              }
            }
          });
        }
      }
    }
    const generalIsoScore = (stats.value as any).generalIsoScore ?? 0;
    const currentScore = generalIsoScore;

    if (finalize) {
        await generatePDF({
            userName: currentName,
            sections,
            checkedItems: { ...progress.completed },
            progresoParcialDecimal: { ...progress.progresoParcialDecimal },
            ignoredItems: { ...progress.ignored },
            evidenceLinks: { ...(progress.evidenceLinks || {}) },
            justifications: { ...(progress.justifications || {}) },
            totalProgress: { completed: done, outOf: total }
        });
    }

    await props.saveAction.submit({
        userName: currentName,
        score: currentScore,
        completedCount: done,
        totalCount: total,
        checkedItems: { ...progress.completed },
        progresoParcialDecimal: { ...progress.progresoParcialDecimal },
        ignoredItems: { ...progress.ignored },
        evidenceLinks: { ...(progress.evidenceLinks || {}) },
        justifications: { ...(progress.justifications || {}) },
        finalize,
        isoScore: stats.value.isoScore,
        egsiScore: stats.value.egsiScore,
        clausesScore: stats.value.clausesScore
    });

    if (!finalize) {
        showToast.value = true;
        setTimeout(() => showToast.value = false, 3000);
    }
  });

  return (
    <div class="mt-8 flex flex-col items-center w-full">
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
      <div class="w-full max-w-5xl p-8 bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-800/80">
        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex-1 w-full text-center md:text-left">
            <h2 class="text-4xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-2">Tu Progreso de Seguridad</h2>
            <p class="opacity-70 mb-8 text-sm">
              Hola, <span class="font-bold text-cyan-400">
                {currentUser?.name || (userName as any).value || 'Invitado'}
              </span>.
              Has completado <span class="text-emerald-400 font-bold">{totalProgress.value.completed}</span> de <span class="font-bold">{totalProgress.value.outOf}</span> recomendaciones.
              <button onClick$={() => setIsWelcomeDismissed(false)} class="ml-2 text-xs text-primary hover:underline">
                (Cambiar Nombre)
              </button>
            </p>

            {/* Barras de Progreso Simultáneas y Reactivas */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Card ISO 27001:2022 (Combined) */}
              <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/40 hover:shadow-indigo-500/5 group text-left flex flex-col justify-between">
                {/* Glow effect */}
                <div class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-300"></div>
                
                <div>
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <span class="text-xs font-bold tracking-wider text-indigo-400 uppercase">Estándar Internacional</span>
                      <h3 class="text-xl font-extrabold text-white mt-1">ISO 27001:2022</h3>
                    </div>
                    <div class="text-right">
                      <span class="text-4xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        {highPrecisionIsoScore.value.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* General Progress Bar */}
                  <div class="mb-6">
                    <div class="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Progreso General ISO 27001:2022</span>
                      <span class="font-semibold text-indigo-300">General</span>
                    </div>
                    <div class="w-full bg-gray-950 rounded-full h-5 p-1 border border-indigo-500/10 shadow-inner overflow-hidden">
                      <div 
                        class="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 relative" 
                        style={{ width: `${highPrecisionIsoScore.value.toFixed(2)}%` }}
                      >
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-bars */}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-800/60">
                  {/* Sub-bar 1: Controles */}
                  <div>
                    <div class="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Controles ISO 27001:2022</span>
                      <span class="font-bold text-indigo-400">{stats.value.isoScore.toFixed(2)}%</span>
                    </div>
                    <div class="w-full bg-gray-950 rounded-full h-3 p-[2px] border border-indigo-500/10 shadow-inner overflow-hidden">
                      <div 
                        class="bg-gradient-to-r from-indigo-500/80 to-purple-500/80 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${stats.value.isoScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Sub-bar 2: Cláusulas */}
                  <div>
                    <div class="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Cláusulas de Auditoría</span>
                      <span class="font-bold text-emerald-400">{stats.value.clausesScore.toFixed(2)}%</span>
                    </div>
                    <div class="w-full bg-gray-950 rounded-full h-3 p-[2px] border border-emerald-500/10 shadow-inner overflow-hidden">
                      <div 
                        class="bg-gradient-to-r from-emerald-500/80 to-green-500/80 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${stats.value.clausesScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card EGSI v3.0 */}
              <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900/60 border border-cyan-500/20 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/40 hover:shadow-cyan-500/5 group text-left flex flex-col justify-between">
                {/* Glow effect */}
                <div class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-cyan-500/10 blur-3xl group-hover:bg-cyan-500/20 transition-all duration-300"></div>

                <div>
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h3 class="text-xl font-extrabold text-white mt-1">ESQUEMA GUBERNAMENTAL DE SEGURIDAD DE LA INFORMACION - EGSI v3.0</h3>
                    </div>
                    <div class="text-right">
                      <span class="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{stats.value.egsiScore.toFixed(2)}%</span>
                    </div>
                  </div>

                  <div class="mb-6">
                    <div class="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Suma ponderada de controles</span>
                      <span class="font-semibold text-cyan-300">Modelo MINTEL</span>
                    </div>
                    <div class="w-full bg-gray-950 rounded-full h-5 p-1 border border-cyan-500/10 shadow-inner overflow-hidden">
                      <div 
                        class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 relative" 
                        style={{ width: `${stats.value.egsiScore}%` }}
                      >
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pt-4 border-t border-gray-800/60 text-xs text-gray-400 flex items-center justify-between h-[40px]">
                  <span>Cumplimiento obligatorio gubernamental</span>
                  <span class="font-bold text-cyan-400">GPR Matriz</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md md:max-w-none mx-auto">
              <button class="btn btn-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300" onClick$={() => handleSave(true)}>
                <Icon icon="download" width={20} height={20} /> Finalizar y Descargar
              </button>
              <button class="btn btn-outline btn-secondary hover:scale-[1.02] active:scale-[0.98] transition-all duration-300" onClick$={() => handleSave(false)}>
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
