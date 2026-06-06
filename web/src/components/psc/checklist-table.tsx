import { $, component$, useStore, useSignal, useContext } from "@builder.io/qwik";
import { useCSSTransition } from "qwik-transition";

import Icon from "~/components/core/icon";
import type { Priority, Section, Checklist } from '../../types/PSC';
import { marked } from "marked";
import { ProgressContext } from "~/store/progress-context";
import { generarRecomendacionesDinamicas } from "~/utils/recomendaciones";
import styles from './psc.module.css';


export default component$((props: { section: Section }) => {

  const progress = useContext(ProgressContext);

  const showFilters = useSignal(false);
  const { stage } = useCSSTransition(showFilters, { timeout: 300 });

  const sortState = useStore({ column: '', ascending: true });

  const checklist = useSignal<Checklist[]>(props.section.checklist);

  const originalFilters = {
    show: 'all', // 'all', 'remaining', 'completed'
    levels: {
      essential: true,
      optional: true,
      advanced: true,
    },
  };

  const filterState = useStore(originalFilters);

  const getBadgeClass = (priority: Priority, precedeClass: string = '') => {
    switch (priority.toLocaleLowerCase()) {
      case 'essential':
        return `${precedeClass}success`;
      case 'optional':
        return `${precedeClass}warning`;
      case 'advanced':
        return `${precedeClass}error`;
      default:
        return `${precedeClass}neutral`;
    }
  };

  const generateId = (title: string) => {
    return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
  };

  const parseMarkdown = (text: string | undefined): string => {
    return marked.parse(text || '', { async: false }) as string || '';
  };

  // Read directly from the shared reactive ProgressContext
  const isIgnored = (pointId: string) => progress.ignored[pointId] || false;
  const getScore = (pointId: string) => {
    if (isIgnored(pointId)) return 0;
    const val = progress.completed[pointId];
    return typeof val === 'number' ? val : (val ? 1 : 0);
  };
  const isChecked = (pointId: string) => getScore(pointId) === 1;

  const filteredChecklist = checklist.value.filter((item) => {
    const itemId = generateId(item.point);
    const itemCompleted = isChecked(itemId);
    const itemIgnored = isIgnored(itemId);
    const itemLevel = item.priority;

    if (filterState.show === 'remaining' && (itemCompleted || itemIgnored)) return false;
    if (filterState.show === 'completed' && !itemCompleted) return false;

    return filterState.levels[itemLevel.toLocaleLowerCase() as Priority];
  });

  const sortChecklist = (a: Checklist, b: Checklist) => {
    if (sortState.column) {
      const getValue = (item: Checklist) => {
        switch (sortState.column) {
          case 'done':
            if (isIgnored(generateId(item.point))) return 2;
            return isChecked(generateId(item.point)) ? 0 : 1;
          case 'advice':
            return item.point;
          case 'level':
            return ['essential', 'optional', 'advanced'].indexOf(item.priority.toLowerCase());
          default:
            return 0;
        }
      };
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA === valueB) return 0;
      else if (sortState.ascending) return valueA < valueB ? -1 : 1;
      else return valueA > valueB ? -1 : 1;
    } else {
      // Default sort by id_norma (e.g. A.5.1 < A.5.2 < A.5.10)
      const idA = (a as any).id_norma || '';
      const idB = (b as any).id_norma || '';
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    }
  };

  const handleSort = $((column: string) => {
    if (sortState.column === column) {
      sortState.ascending = !sortState.ascending;
    } else {
      sortState.column = column;
      sortState.ascending = true;
    }
  });

  const resetFilters = $(() => {
    checklist.value = props.section.checklist;
    sortState.column = '';
    sortState.ascending = true;
    filterState.levels = originalFilters.levels;
    filterState.show = originalFilters.show;
  });

  const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

  // Identify all parent IDs that have children in the checklist
  const parentIdsWithChildren = new Set<string>();
  props.section.checklist.forEach(item => {
    const idNorma = (item as any).id_norma;
    if (typeof idNorma === 'string' && idNorma.trim() !== '') {
      const match = idNorma.trim().match(SUB_ITEM_REGEX);
      if (match) {
        parentIdsWithChildren.add(match[1]);
      }
    }
  });

  const calculateProgress = (): { done: number, total: number, percent: number, disabled: number} => {
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
    const isClausesSection = props.section.title === 'Cláusulas ISO 27001';

    if (isClausesSection) {
      let scoreObtained = 0;
      let disabledCount = 0;

      props.section.checklist.forEach(item => {
        const idNorma = (item as any).id_norma;
        if (typeof idNorma === 'string' && idNorma.trim() !== '') {
          const match = idNorma.trim().match(SUB_ITEM_REGEX);
          if (match) {
            const itemId = generateId(item.point);
            if (isIgnored(itemId)) {
              disabledCount++;
            } else {
              const baseVal = getScore(itemId);
              const partialVal = progress.progresoParcialDecimal?.[itemId];
              const pValue = partialVal !== undefined && partialVal !== null
                ? Number(partialVal)
                : (baseVal === 0.5 ? 0.50 : (baseVal === 1.0 ? 1.00 : 0.00));
              const hasDriveLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';

              if (baseVal === 1.0 || baseVal === 0.5) {
                if (hasDriveLink) {
                  scoreObtained += pValue;
                } else {
                  scoreObtained += pValue * 0.4;
                }
              }
            }
          }
        }
      });

      const percent = Math.round((scoreObtained / 28) * 100);
      return { done: Number(scoreObtained.toFixed(2)), total: 28, percent, disabled: disabledCount };
    }

    let scoreObtained = 0;
    let disabledCount = 0;
    let totalCount = 0;

    const getSingleItemScore = (item: Checklist) => {
      const itemId = generateId(item.point);
      if (isIgnored(itemId)) return { score: 0, isIgnored: true };

      const baseVal = getScore(itemId);
      const partialVal = progress.progresoParcialDecimal?.[itemId];
      const pValue = partialVal !== undefined && partialVal !== null
        ? Number(partialVal)
        : (baseVal === 0.5 ? 0.50 : (baseVal === 1.0 ? 1.00 : 0.00));
      return { score: pValue, isIgnored: false };
    };

    // Identify all parents in this section
    const parentIdsWithChildren = new Set<string>();
    props.section.checklist.forEach(item => {
      const idNorma = (item as any).id_norma;
      if (typeof idNorma === 'string' && idNorma.trim() !== '') {
        const match = idNorma.trim().match(SUB_ITEM_REGEX);
        if (match) {
          parentIdsWithChildren.add(match[1]);
        }
      }
    });

    // Process only leaf items (those that are not parents)
    props.section.checklist.forEach(item => {
      const idNorma = (item as any).id_norma?.trim() || '';
      const isParent = idNorma && parentIdsWithChildren.has(idNorma);
      if (isParent) return; // Skip parent grouping headers

      const { score, isIgnored: itemIgnored } = getSingleItemScore(item);
      if (itemIgnored) {
        disabledCount++;
      } else {
        totalCount++;
        scoreObtained += score;
      }
    });

    const percent = totalCount === 0 ? 0 : Math.round((scoreObtained / totalCount) * 100);
    return { done: Number(scoreObtained.toFixed(2)), total: totalCount, percent, disabled: disabledCount };
  };

  const { done, total, percent, disabled } = calculateProgress();

  // Define the type for items in the rendering list
  type RenderItem = 
    | { type: 'flat'; item: Checklist }
    | { type: 'accordion'; prefix: string; title: string; items: Checklist[] };

  // Expanded accordion states
  const expandedPrefixes = useStore<Record<string, boolean>>({});

  // Safe helper to extract id_norma from checklist item
  // ONLY use the explicit id_norma field — never fall back to details text,
  // which can contain arbitrary strings that falsely match the sub-item regex.
  const getIdNorma = (item: Checklist): string => {
    const norma = (item as any).id_norma;
    return typeof norma === 'string' && norma.trim() !== '' ? norma.trim() : '';
  };

  // Safe helper to determine accordion group title
  const getGroupTitle = (prefix: string, groupItems: Checklist[]) => {
    // First: look for a parent item whose id_norma exactly equals the prefix
    const parentItem = props.section.checklist.find(item => {
      const norma = (item as any).id_norma;
      return typeof norma === 'string' && norma.trim() === prefix;
    });
    if (parentItem) {
      return parentItem.point;
    }

    // Second: use the tipo_control of the first sub-item (if informative)
    const firstItem = groupItems[0];
    if (firstItem) {
      const tc = (firstItem as any).tipo_control;
      if (typeof tc === 'string' && tc.trim() !== '' && tc !== 'N/A') {
        return tc.trim();
      }
      return firstItem.point;
    }
    return prefix;
  };

  const sortedList = [...filteredChecklist].sort(sortChecklist);
  const renderList: RenderItem[] = [];
  const processedGroups = new Set<string>();

  sortedList.forEach(item => {
    const idNorma = getIdNorma(item);
    const match = idNorma ? idNorma.match(SUB_ITEM_REGEX) : null;
    if (match) {
      const prefix = match[1];
      if (!processedGroups.has(prefix)) {
        processedGroups.add(prefix);
        const groupItems = sortedList.filter(i => {
          const idN = getIdNorma(i);
          const m = idN ? idN.match(SUB_ITEM_REGEX) : null;
          return m && m[1] === prefix;
        });
        const title = getGroupTitle(prefix, groupItems);
        renderList.push({
          type: 'accordion',
          prefix,
          title,
          items: groupItems
        });
      }
    } else {
      if (parentIdsWithChildren.has(idNorma)) {
        return; // Skip parent items that have children from rendering as flat items
      }
      renderList.push({
        type: 'flat',
        item
      });
    }
  });

  return (
    <>

    <div class="flex flex-col md:flex-row justify-between items-start md:items-center w-full mb-6 gap-6 bg-gray-900/40 p-4 rounded-xl border border-gray-800 shadow-sm">
      <div class="w-full flex-1 max-w-sm">
        <div class="flex justify-between items-end mb-2">
            <span class="text-sm font-bold text-gray-300">Cumplimiento del Dominio</span>
            <span class="text-xs font-mono font-bold text-cyan-400 bg-cyan-900/30 px-2.5 py-1 rounded-md border border-cyan-800/50 shadow-inner">
                {done} / {total} ({percent}%)
            </span>
        </div>
        <progress class="progress progress-info w-full h-2 bg-gray-800" value={percent} max="100"></progress>
        <div class="flex justify-between mt-2 text-[10px] uppercase tracking-wider font-bold opacity-60">
           <span class="flex items-center gap-1.5 h-4">
             {progress.isSyncing ? (
                 <>
                    <span class="loading loading-spinner loading-xs text-info h-3 w-3"></span>
                    Sincronizando...
                 </>
             ) : (
                 <>
                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></span>
                    Almacenado
                 </>
             )}
           </span>
           {disabled > 0 && <span class="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{disabled} Omitidos</span>}
        </div>
      </div>

      <div class="flex flex-wrap gap-2 justify-end shrink-0 w-full md:w-auto">
        {(sortState.column || JSON.stringify(filterState) !== JSON.stringify(originalFilters)) && (
          <button class="btn btn-sm border-gray-700 bg-gray-800 hover:bg-gray-700 hover:border-gray-500 text-gray-300" onClick$={resetFilters}>
            <Icon width={14} height={14} icon="clear"/>
            Limpiar Filtros
          </button>
        )}
        <button class="btn btn-sm btn-outline border-cyan-800 hover:bg-cyan-900 hover:border-cyan-500 text-cyan-500" onClick$={() => { showFilters.value = !showFilters.value; }}>
          <Icon width={14} height={14} icon="filters"/>
          {showFilters.value ? 'Ocultar Filtros' : 'Filtros y Vistas'}
        </button>
      </div>
    </div>

    {showFilters.value && (
      <div class="flex flex-wrap justify-between bg-base-100 rounded px-4 py-1 transition-all"
        style={{ opacity: stage.value === "enterTo" ? 1 : 0, height: stage.value === "enterTo" ? 'auto' : 0 }}> 
        {/* Filter by completion */}
        <div class="flex justify-end items-center gap-1">
          <p class="font-bold text-sm">Show</p>
          <label onClick$={() => (filterState.show = 'all')}
            class="p-2 rounded hover:bg-front transition-all cursor-pointer flex gap-2">
            <span class="text-sm">All</span> 
            <input type="radio" name="show" class="radio radio-sm checked:radio-info" checked />
          </label>
          <label onClick$={() => (filterState.show = 'remaining')}
            class="p-2 rounded hover:bg-front transition-all cursor-pointer flex gap-2">
            <span class="text-sm">Remaining</span> 
            <input type="radio" name="show" class="radio radio-sm checked:radio-error" />
          </label>
          <label onClick$={() => (filterState.show = 'completed')}
            class="p-2 rounded hover:bg-front transition-all cursor-pointer flex gap-2">
            <span class="text-sm">Completed</span> 
            <input type="radio" name="show" class="radio radio-sm checked:radio-success" />
          </label>
        </div>
        {/* Filter by level */}
        <div class="flex justify-end items-center gap-1">
          <p class="font-bold text-sm">Filter</p>
          <label class="p-2 rounded hover:bg-front transition-all cursor-pointer flex gap-2">
            <span class="text-sm">Basic</span> 
            <input
              type="checkbox"
              checked={filterState.levels.essential}
              onChange$={() => (filterState.levels.essential = !filterState.levels.essential)}
              class="checkbox checkbox-sm checked:checkbox-success"
            />
          </label>
          <label class="p-2 rounded hover:bg-front transition-all cursor-pointer flex gap-2">
            <span class="text-sm">Optional</span> 
            <input
              type="checkbox"
              checked={filterState.levels.optional}
              onChange$={() => (filterState.levels.optional = !filterState.levels.optional)}
              class="checkbox checkbox-sm checked:checkbox-warning"
            />
          </label>
          <label
            class="p-2 rounded hover:bg-front transition-all cursor-pointer flex gap-2">
            <span class="text-sm">Advanced</span> 
            <input
              type="checkbox"
              checked={filterState.levels.advanced}
              class="checkbox checkbox-sm checked:checkbox-error"
              onChange$={() => (filterState.levels.advanced = !filterState.levels.advanced)}
            />
          </label>
        </div>
      </div>
    )}

    <table class="table">
      <thead>
        <tr>
          { [
            { id: 'done', text: 'Done?'},
            { id: 'advice', text: 'Advice' },
            { id: 'level', text: 'Level' }
          ].map((item) => (
            <th
              key={item.id}
              class="cursor-pointer"
              onClick$={() => handleSort(item.id)}
            >
              <span class="flex items-center gap-0.5 hover:text-primary transition">
                <Icon width={12} height={14} icon="sort" />
                {item.text}
              </span>
            </th>
          ))}
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {renderList.map((renderItem, rIndex) => {
          if (renderItem.type === 'flat') {
            const item = renderItem.item;
            const badgeColor = getBadgeClass(item.priority);
            const itemId = generateId(item.point);
            const isItemCompleted = isChecked(itemId);
            const isItemIgnored = isIgnored(itemId);
            
            const numericVal = getScore(itemId);
            const hasDriveLink = !!progress.evidenceLinks?.[itemId];
            
            const partialVal = progress.progresoParcialDecimal?.[itemId];
            const pValue = partialVal !== undefined && partialVal !== null
              ? Number(partialVal)
              : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

            let finalScore = 0.0;
            if (numericVal === 1.0 || numericVal === 0.5) {
                finalScore = hasDriveLink ? pValue : pValue * 0.4;
            }

            let idNorma = getIdNorma(item);
            
            let recText = null;
            if (!isItemIgnored && finalScore < 1.0) {
                const recs = generarRecomendacionesDinamicas([{
                    ID: rIndex,
                    ID_Norma: idNorma,
                    Dominio_Control: props.section.title,
                    Pregunta: item.point,
                    puntaje_calculado: finalScore
                }]);
                if (recs.length > 0) {
                    recText = recs[0].recomendacion.replace(`Para el control ${idNorma}: `, '');
                }
            }

            return (
              <tr key={`flat-${itemId}`} class={[
                'rounded-sm transition-all border-b border-gray-800/40',
                isItemCompleted ? `bg-${badgeColor} bg-opacity-10` : '',
                isItemIgnored? 'bg-neutral bg-opacity-15' : '',
                !isItemIgnored && !isItemCompleted ? `hover:bg-opacity-5 hover:bg-${badgeColor}` : '',
                ]}>
                <td class="text-center min-w-[140px] py-3">
                    <div class="flex flex-col gap-1.5 w-full">
                        <select
                          class={`select select-bordered select-xs w-full border-${badgeColor}`}
                          onChange$={(e) => {
                            const valStr = (e.target as HTMLSelectElement).value;
                            if (valStr === 'na') {
                              progress.ignored = { ...progress.ignored, [itemId]: true };
                              progress.completed = { ...progress.completed, [itemId]: false };
                            } else {
                              const val = parseFloat(valStr);
                              progress.completed = { ...progress.completed, [itemId]: val };
                              progress.ignored = { ...progress.ignored, [itemId]: false };
                              if (val === 0.5) {
                                  const currPartial = progress.progresoParcialDecimal?.[itemId];
                                  if (currPartial === undefined || currPartial === 1.0 || currPartial === 0.0) {
                                      progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: 0.50 };
                                  }
                              } else if (val === 1.0) {
                                  progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: 1.00 };
                              } else {
                                  progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: 0.00 };
                              }
                            }
                          }}
                        >
                          <option value="1" selected={!isIgnored(itemId) && getScore(itemId) === 1}>Cumple</option>
                          <option value="0.5" selected={!isIgnored(itemId) && getScore(itemId) === 0.5}>Parcial</option>
                          <option value="0" selected={!isIgnored(itemId) && getScore(itemId) === 0}>No Cumple</option>
                          <option value="na" selected={isIgnored(itemId)}>N/A - No Aplica</option>
                        </select>

                        {!isIgnored(itemId) && getScore(itemId) === 0.5 && (
                            <div class="flex items-center gap-1 w-full animate-fade-in mt-1.5">
                                <span class="text-[9px] uppercase font-black text-cyan-500/80 shrink-0">Grado:</span>
                                <select
                                  class="select select-bordered select-xs flex-1 text-[11px] h-7 min-h-[1.75rem] bg-slate-900 border-cyan-500/60 text-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 font-black rounded-lg"
                                  onChange$={(e) => {
                                      const val = parseFloat((e.target as HTMLSelectElement).value);
                                      progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: val };
                                  }}
                                >
                                    {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((dec) => {
                                        const percentStr = `${Math.round(dec * 100)}%`;
                                        const currentVal = progress.progresoParcialDecimal?.[itemId] ?? 0.50;
                                        return (
                                            <option 
                                                key={dec} 
                                                value={dec.toString()} 
                                                selected={Math.abs(currentVal - dec) < 0.01}
                                                class="bg-slate-950 text-white font-bold"
                                            >
                                                {percentStr}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                    </div>
                    {!isItemIgnored && (
                        <div class="mt-2 dropdown">
                            <div tabIndex={0} role="button" class={`btn btn-xs btn-outline ${progress.evidenceLinks?.[itemId] ? 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20' : 'border-gray-600 text-gray-400 hover:bg-gray-800'} gap-1 w-full flex items-center justify-between transition-all duration-300`}>
                                <span class="truncate max-w-[80px] text-[9px] font-bold uppercase tracking-wider">
                                    {progress.evidenceLinks?.[itemId] ? 'Vinculado' : 'Evidencia'}
                                </span>
                                {progress.evidenceLinks?.[itemId] ? (
                                    <svg viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-cyan-400"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 1-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                                ) : (
                                    <svg viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>
                                )}
                            </div>
                            <div tabIndex={0} class="dropdown-content z-[100] w-72 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-[#1a1f2e]/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 mt-1 left-0">
                                <h3 class="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-1 flex items-center gap-2">
                                    Vincular Evidencia Drive
                                </h3>
                                <p class="text-[10px] text-gray-400 mb-3 leading-relaxed">
                                    Pega aquí el enlace público o compartido de tu documento para evitar penalizaciones en el cálculo de madurez.
                                </p>
                                <div class="relative">
                                    <input 
                                        type="text" 
                                        placeholder="https://drive.google.com/..." 
                                        class="input input-bordered input-sm w-full bg-black/40 text-xs border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all pl-8"
                                        value={progress.evidenceLinks?.[itemId] || ''}
                                        onInput$={(e) => {
                                            const val = (e.target as HTMLInputElement).value;
                                            progress.evidenceLinks = { ...(progress.evidenceLinks || {}), [itemId]: val };
                                        }}
                                        onChange$={(e) => {
                                            const val = (e.target as HTMLInputElement).value;
                                            progress.evidenceLinks = { ...(progress.evidenceLinks || {}), [itemId]: val };
                                        }}
                                    />
                                    <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-500 absolute left-2.5 top-2.5"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>
                                </div>
                                {progress.evidenceLinks?.[itemId] && (
                                    <div class="mt-3 flex items-center justify-between bg-cyan-500/10 rounded-lg p-2 border border-cyan-500/20">
                                        <span class="text-[10px] text-cyan-200/70 font-medium">Enlace guardado en vivo.</span>
                                        <a href={progress.evidenceLinks?.[itemId]} target="_blank" class="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1">
                                            Probar <svg viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clip-rule="evenodd" /></svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {isItemIgnored && (
                        <div class="mt-1">
                            <textarea 
                                placeholder="Justificación requerida..." 
                                class={`textarea textarea-bordered textarea-xs w-full bg-transparent text-[10px] opacity-90 ${!(progress.justifications?.[itemId]?.trim()) ? 'border-error border-2 placeholder-error' : 'border-neutral'}`}
                                value={progress.justifications?.[itemId] || ''}
                                onInput$={(e) => {
                                    const val = (e.target as HTMLTextAreaElement).value;
                                    progress.justifications = { ...(progress.justifications || {}), [itemId]: val };
                                }}
                                rows={2}
                            ></textarea>
                        </div>
                    )}
                </td>
                <td class="py-3">
                  <div class="flex flex-col gap-2">
                    <div class="flex items-baseline gap-2">
                      <span class="text-xs font-mono bg-gray-800/80 px-1.5 py-0.5 rounded text-gray-400 font-black">
                        {idNorma}
                      </span>
                      <label
                        for={`done-${itemId}`}
                        class={`text-base font-bold ${isIgnored(itemId) ? 'line-through opacity-50' : 'cursor-pointer'}`}>
                        {item.point}
                      </label>
                    </div>
                    {recText && (
                      <div class={`text-[11px] p-2.5 rounded-lg border leading-tight shadow-sm transition-all duration-300 mt-1 max-w-xl ${finalScore <= 0.2 ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-orange-900/20 border-orange-500/30 text-orange-300'}`}>
                         <strong class="uppercase text-[9px] tracking-wider mb-1 block opacity-80">
                           {finalScore <= 0.2 ? '🔥 Acción Crítica Requerida' : '⚠️ Brecha Moderada'}
                         </strong>
                         {recText}
                      </div>
                    )}
                  </div>
                </td>
                <td class="py-3">
                  <div class={`badge gap-2 badge-${badgeColor}`}>
                    {item.priority}
                  </div>
                </td>
                <td class={styles.checklistItemDescription} dangerouslySetInnerHTML={parseMarkdown(item.details)}></td>
              </tr>
            );
          } else {
            const { prefix, title, items } = renderItem;
            const isExpanded = expandedPrefixes[prefix] || false;
            
            // Count completed items in the group
            const completedCount = items.filter(item => {
                const itemId = generateId(item.point);
                return isChecked(itemId);
            }).length;

            const parentItem = props.section.checklist.find(item => {
                const norma = (item as any).id_norma;
                return typeof norma === 'string' && norma.trim() === prefix;
            });
            const parentItemId = parentItem ? generateId(parentItem.point) : '';
            const parentComment = parentItemId ? progress.justifications?.[parentItemId] : '';
            const parentEvidence = parentItemId ? progress.evidenceLinks?.[parentItemId] : '';

            return (
              <>
                {/* Group Header Row */}
                <tr 
                  key={`group-header-${prefix}`} 
                  class={[
                    "cursor-pointer transition-all duration-300 select-none border-b border-gray-800/60 animate-fade-in",
                    isExpanded 
                      ? "bg-gradient-to-r from-cyan-950/50 via-slate-900/60 to-slate-950/80 border-l-4 border-l-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:from-cyan-900/40 hover:via-slate-800/50 hover:to-slate-900/70"
                      : "bg-gradient-to-r from-gray-950/70 to-gray-900/30 border-l-4 border-l-slate-700/80 hover:from-gray-900/80 hover:to-gray-800/40"
                  ]}
                  onClick$={() => {
                      expandedPrefixes[prefix] = !isExpanded;
                  }}
                >
                  <td colSpan={4} class="p-4">
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center gap-3">
                        <span class={[
                          "text-xs font-black px-2.5 py-1 rounded border font-mono tracking-wider transition-all duration-300",
                          isExpanded 
                            ? "text-cyan-400 bg-cyan-900/40 border-cyan-500/60 shadow-[0_0_8px_rgba(34,211,238,0.25)]"
                            : "text-slate-400 bg-slate-800/40 border-slate-700/50"
                        ]}>
                          {prefix}
                        </span>
                        <div class="flex flex-col">
                          <span class={[
                            "text-sm sm:text-base tracking-wide transition-all duration-300",
                            isExpanded 
                              ? "font-black text-white" 
                              : "font-bold text-gray-400"
                          ]}>
                            {title}
                          </span>
                          {(parentComment || parentEvidence) && (
                            <div class="mt-2 text-xs bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/50 max-w-2xl font-normal leading-relaxed text-gray-300">
                              {parentComment && (
                                <p class="flex items-start gap-1">
                                  <span class="font-bold text-cyan-400 shrink-0">Comentario:</span> 
                                  <span>{parentComment}</span>
                                </p>
                              )}
                              {parentEvidence && (
                                <p class="flex items-start gap-1 mt-1">
                                  <span class="font-bold text-emerald-400 shrink-0">Evidencia:</span> 
                                  <a href={parentEvidence} target="_blank" class="text-cyan-400 hover:underline break-all">{parentEvidence}</a>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class={[
                          "badge badge-sm font-bold px-2.5 py-1.5 transition-all duration-300 border",
                          isExpanded
                            ? "bg-cyan-900/60 border-cyan-500/50 text-cyan-300"
                            : "bg-slate-800/40 border-slate-700/50 text-slate-400"
                        ]}>
                          {completedCount} / {items.length} completados
                        </span>
                        <svg 
                          viewBox="0 0 20 20" 
                          fill="currentColor" 
                          class={[
                            "w-5 h-5 transition-all duration-300",
                            isExpanded ? "text-cyan-400 rotate-180 drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]" : "text-slate-500 rotate-0"
                          ]}
                        >
                          <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Sub-items */}
                {isExpanded && items.map((item, subIndex) => {
                    const badgeColor = getBadgeClass(item.priority);
                    const itemId = generateId(item.point);
                    const isItemCompleted = isChecked(itemId);
                    const isItemIgnored = isIgnored(itemId);
                    const numericVal = getScore(itemId);
                    const hasDriveLink = !!progress.evidenceLinks?.[itemId];
                    
                    const partialVal = progress.progresoParcialDecimal?.[itemId];
                    const pValue = partialVal !== undefined && partialVal !== null
                      ? Number(partialVal)
                      : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

                    let finalScore = 0.0;
                    if (numericVal === 1.0 || numericVal === 0.5) {
                        finalScore = hasDriveLink ? pValue : pValue * 0.4;
                    }

                    let idNorma = getIdNorma(item);
                    
                    let recText = null;
                    if (!isItemIgnored && finalScore < 1.0) {
                        const recs = generarRecomendacionesDinamicas([{
                            ID: subIndex,
                            ID_Norma: idNorma,
                            Dominio_Control: props.section.title,
                            Pregunta: item.point,
                            puntaje_calculado: finalScore
                        }]);
                        if (recs.length > 0) {
                            recText = recs[0].recomendacion.replace(`Para el control ${idNorma}: `, '');
                        }
                    }

                    return (
                      <tr 
                        key={`sub-${itemId}`} 
                        class={[
                          'border-l-4 border-l-cyan-600/30 bg-slate-900/25 transition-all border-b border-gray-800/40 animate-fade-in',
                          isItemCompleted ? `bg-${badgeColor} bg-opacity-5` : '',
                          isItemIgnored ? 'bg-neutral bg-opacity-10' : '',
                          !isItemIgnored && !isItemCompleted ? `hover:bg-opacity-5 hover:bg-${badgeColor}` : '',
                        ]}
                      >
                        <td class="text-center min-w-[140px] pl-6 py-3">
                          <div class="flex flex-col gap-1.5 w-full">
                              <select
                                class={`select select-bordered select-xs w-full border-${badgeColor}`}
                                onChange$={(e) => {
                                  const valStr = (e.target as HTMLSelectElement).value;
                                  if (valStr === 'na') {
                                    progress.ignored = { ...progress.ignored, [itemId]: true };
                                    progress.completed = { ...progress.completed, [itemId]: false };
                                  } else {
                                    const val = parseFloat(valStr);
                                    progress.completed = { ...progress.completed, [itemId]: val };
                                    progress.ignored = { ...progress.ignored, [itemId]: false };
                                    if (val === 0.5) {
                                        const currPartial = progress.progresoParcialDecimal?.[itemId];
                                        if (currPartial === undefined || currPartial === 1.0 || currPartial === 0.0) {
                                            progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: 0.50 };
                                        }
                                    } else if (val === 1.0) {
                                        progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: 1.00 };
                                    } else {
                                        progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: 0.00 };
                                    }
                                  }
                                }}
                              >
                                <option value="1" selected={!isIgnored(itemId) && getScore(itemId) === 1}>Cumple</option>
                                <option value="0.5" selected={!isIgnored(itemId) && getScore(itemId) === 0.5}>Parcial</option>
                                <option value="0" selected={!isIgnored(itemId) && getScore(itemId) === 0}>No Cumple</option>
                                <option value="na" selected={isIgnored(itemId)}>N/A - No Aplica</option>
                              </select>

                              {!isIgnored(itemId) && getScore(itemId) === 0.5 && (
                                  <div class="flex items-center gap-1 w-full animate-fade-in mt-1.5">
                                      <span class="text-[9px] uppercase font-black text-cyan-500/80 shrink-0">Grado:</span>
                                      <select
                                        class="select select-bordered select-xs flex-1 text-[11px] h-7 min-h-[1.75rem] bg-slate-900 border-cyan-500/60 text-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 font-black rounded-lg"
                                        onChange$={(e) => {
                                            const val = parseFloat((e.target as HTMLSelectElement).value);
                                            progress.progresoParcialDecimal = { ...(progress.progresoParcialDecimal || {}), [itemId]: val };
                                        }}
                                      >
                                          {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((dec) => {
                                              const percentStr = `${Math.round(dec * 100)}%`;
                                              const currentVal = progress.progresoParcialDecimal?.[itemId] ?? 0.50;
                                              return (
                                                  <option 
                                                      key={dec} 
                                                      value={dec.toString()} 
                                                      selected={Math.abs(currentVal - dec) < 0.01}
                                                      class="bg-slate-950 text-white font-bold"
                                                  >
                                                      {percentStr}
                                                  </option>
                                              );
                                          })}
                                      </select>
                                  </div>
                              )}
                          </div>

                          {!isItemIgnored && (
                              <div class="mt-2 dropdown">
                                  <div tabIndex={0} role="button" class={`btn btn-xs btn-outline ${progress.evidenceLinks?.[itemId] ? 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20' : 'border-gray-600 text-gray-400 hover:bg-gray-800'} gap-1 w-full flex items-center justify-between transition-all duration-300`}>
                                      <span class="truncate max-w-[80px] text-[9px] font-bold uppercase tracking-wider">
                                          {progress.evidenceLinks?.[itemId] ? 'Vinculado' : 'Evidencia'}
                                      </span>
                                      {progress.evidenceLinks?.[itemId] ? (
                                          <svg viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-cyan-400"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 1-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                                      ) : (
                                          <svg viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>
                                      )}
                                  </div>
                                  <div tabIndex={0} class="dropdown-content z-[100] w-72 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-[#1a1f2e]/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 mt-1 left-0">
                                      <h3 class="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-1 flex items-center gap-2">
                                          Vincular Evidencia Drive
                                      </h3>
                                      <p class="text-[10px] text-gray-400 mb-3 leading-relaxed">
                                          Pega aquí el enlace público o compartido de tu documento para evitar penalizaciones en el cálculo de madurez.
                                      </p>
                                      <div class="relative">
                                          <input 
                                              type="text" 
                                              placeholder="https://drive.google.com/..." 
                                              class="input input-bordered input-sm w-full bg-black/40 text-xs border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all pl-8"
                                              value={progress.evidenceLinks?.[itemId] || ''}
                                              onInput$={(e) => {
                                                  const val = (e.target as HTMLInputElement).value;
                                                  progress.evidenceLinks = { ...(progress.evidenceLinks || {}), [itemId]: val };
                                              }}
                                              onChange$={(e) => {
                                                  const val = (e.target as HTMLInputElement).value;
                                                  progress.evidenceLinks = { ...(progress.evidenceLinks || {}), [itemId]: val };
                                              }}
                                          />
                                          <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-500 absolute left-2.5 top-2.5"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>
                                      </div>
                                      {progress.evidenceLinks?.[itemId] && (
                                          <div class="mt-3 flex items-center justify-between bg-cyan-500/10 rounded-lg p-2 border border-cyan-500/20">
                                              <span class="text-[10px] text-cyan-200/70 font-medium">Enlace guardado en vivo.</span>
                                              <a href={progress.evidenceLinks?.[itemId]} target="_blank" class="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1">
                                                  Probar <svg viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clip-rule="evenodd" /></svg>
                                              </a>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}

                          {isItemIgnored && (
                              <div class="mt-1">
                                  <textarea 
                                      placeholder="Justificación requerida..." 
                                      class={`textarea textarea-bordered textarea-xs w-full bg-transparent text-[10px] opacity-90 ${!(progress.justifications?.[itemId]?.trim()) ? 'border-error border-2 placeholder-error' : 'border-neutral'}`}
                                      value={progress.justifications?.[itemId] || ''}
                                      onInput$={(e) => {
                                          const val = (e.target as HTMLTextAreaElement).value;
                                          progress.justifications = { ...(progress.justifications || {}), [itemId]: val };
                                      }}
                                      rows={2}
                                  ></textarea>
                              </div>
                          )}
                        </td>
                        <td class="py-3">
                          <div class="flex items-start gap-2 pl-2">
                            <span class="text-cyan-500 font-bold shrink-0 text-sm mt-0.5">↳</span>
                            <div class="flex flex-col gap-2">
                              <div class="flex items-baseline gap-2">
                                <span class="text-xs font-mono bg-gray-800/80 px-1.5 py-0.5 rounded text-gray-400 font-black">
                                  {idNorma}
                                </span>
                                <label
                                  for={`done-${itemId}`}
                                  class={`text-sm font-bold ${isIgnored(itemId) ? 'line-through opacity-50' : 'cursor-pointer'}`}
                                >
                                  {item.point}
                                </label>
                              </div>
                              {recText && (
                                <div class={`text-[11px] p-2.5 rounded-lg border leading-tight shadow-sm transition-all duration-300 mt-1 max-w-xl ${finalScore <= 0.2 ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-orange-900/20 border-orange-500/30 text-orange-300'}`}>
                                   <strong class="uppercase text-[9px] tracking-wider mb-1 block opacity-80">
                                     {finalScore <= 0.2 ? '🔥 Acción Crítica Requerida' : '⚠️ Brecha Moderada'}
                                   </strong>
                                   {recText}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td class="py-3">
                          <div class={`badge gap-2 badge-${badgeColor} text-xs font-semibold`}>
                            {item.priority}
                          </div>
                        </td>
                        <td class={`${styles.checklistItemDescription} py-3 text-xs`} dangerouslySetInnerHTML={parseMarkdown(item.details)}></td>
                      </tr>
                    );
                })}
              </>
            );
          }
        })}
      </tbody>
    </table>
    </>
  );
});
