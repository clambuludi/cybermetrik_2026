import { component$, useComputed$, useContext } from "@builder.io/qwik";

import type { Checklist, Section } from '~/types/PSC';
import Icon from '~/components/core/icon';
import styles from './psc.module.css';
import { ProgressContext } from '~/store/progress-context';

export default component$((props: { sections: Section[] }) => {

  const progress = useContext(ProgressContext);

  // Compute stats for all sections reactively
  const sectionStats = useComputed$(() => {
    const sections = Array.isArray(props.sections) ? props.sections : [];
    const id = (item: Checklist) => item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
    
    return sections.map(section => {
        const sectionItems = section.checklist || [];
        const isClausesSection = section.title === 'Cláusulas ISO 27001';

        const childrenMap = new Map<string, any[]>();
        const parentItems: any[] = [];

        sectionItems.forEach(item => {
          const idNorma = (item as any).id_norma;
          if (typeof idNorma === 'string' && idNorma.trim() !== '') {
            const match = idNorma.trim().match(SUB_ITEM_REGEX);
            if (match) {
              const parentId = match[1];
              if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
              }
              childrenMap.get(parentId)!.push(item);
            } else {
              parentItems.push(item);
            }
          } else {
            parentItems.push(item);
          }
        });

        const getSingleItemScore = (item: any) => {
          const itemId = id(item);
          if (progress.ignored[itemId]) return { score: 0, isIgnored: true };
          const val = progress.completed[itemId];
          const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
          const partialVal = progress.progresoParcialDecimal?.[itemId];
          const pValue = partialVal !== undefined && partialVal !== null
            ? Number(partialVal)
            : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
          return { score: pValue, isIgnored: false };
        };

        let total = 0;
        let countDone = 0;

        if (isClausesSection) {
          total = 28;
          sectionItems.forEach(item => {
            const idNorma = (item as any).id_norma;
            if (typeof idNorma === 'string' && idNorma.trim() !== '') {
              const match = idNorma.trim().match(SUB_ITEM_REGEX);
              if (match) {
                const itemId = id(item);
                if (!progress.ignored[itemId]) {
                  const val = progress.completed[itemId];
                  const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
                  const partialVal = progress.progresoParcialDecimal?.[itemId];
                  const pValue = partialVal !== undefined && partialVal !== null
                    ? Number(partialVal)
                    : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));
                  const hasDriveLink = typeof progress.evidenceLinks?.[itemId] === 'string' && progress.evidenceLinks[itemId].trim() !== '';

                  if (numericVal === 1.0 || numericVal === 0.5) {
                    if (hasDriveLink) {
                      countDone += pValue;
                    } else {
                      countDone += pValue * 0.4;
                    }
                  }
                }
              }
            }
          });
        } else {
          // Identify all parents in this section
          const parentIdsWithChildren = new Set<string>();
          sectionItems.forEach(item => {
            const idNorma = (item as any).id_norma;
            if (typeof idNorma === 'string' && idNorma.trim() !== '') {
              const match = idNorma.trim().match(SUB_ITEM_REGEX);
              if (match) {
                parentIdsWithChildren.add(match[1]);
              }
            }
          });

          // Process only leaf items (those that are not parents)
          sectionItems.forEach(item => {
            const idNorma = (item as any).id_norma?.trim() || '';
            const isParent = idNorma && parentIdsWithChildren.has(idNorma);
            if (isParent) return; // Skip parent grouping headers

            const { score, isIgnored } = getSingleItemScore(item);
            if (!isIgnored) {
              total++;
              countDone += score;
            }
          });
        }

        const percentage = total === 0 ? 0 : Math.round((countDone / total) * 100);
        
        return {
            done: Number(countDone.toFixed(2)),
            total,
            itemsCount: total,
            percentage
        };
    });
  });

  return (
    <div class={[styles.container, 'grid',
      'mx-auto mt-8 px-4 gap-7', 'xl:px-10 xl:max-w-7xl',
      'transition-all', 'max-w-6xl w-full']}>
      {(Array.isArray(props.sections) ? props.sections : []).map((section: Section, index: number) => (
        <a key={section.slug}
          href={`/checklist/${section.slug}`}
          class={[
            'card card-side bg-front bg-opacity-25 shadow-md transition-all px-2',
            `outline-offset-2 outline-${section.color}-400`,
            'hover:outline hover:outline-10 hover:outline-offset-4 hover:bg-opacity-15',
            `hover:bg-${section.color}-600`
          ]}
        >
          <div class="flex-shrink-0 flex flex-col py-4 h-auto items-stretch justify-evenly">
            <Icon icon={section.icon || 'star'} color={section.color} />
            {section.title === 'Cláusulas ISO 27001' ? (
              <p class={`text-${section.color}-400 pt-2 pb-0 px-0 mx-0 my-0 text-center`}>
                {sectionStats.value[index].done}/28 cláusulas
              </p>
            ) : (sectionStats.value[index]?.done > 0) ? (
              <p class={`text-${section.color}-400 pt-2 pb-0 px-0 mx-0 my-0 text-center`}>
                {sectionStats.value[index].done}/{sectionStats.value[index].itemsCount} Hecho
              </p>
            ) : (
              <p class={`text-${section.color}-400 pt-2 pb-0 px-0 mx-0 my-0 text-center`}>
                {sectionStats.value[index].itemsCount} Ítems
              </p>
            )}
          </div>
          <div class="card-body flex-grow py-2 pl-4 pr-0">
            <h2 class={`card-title text-${section.color}-400 hover:text-${section.color}-500`}>
              {section.title}
            </h2>
            <p class="p-0 text-sm line-clamp-2">{section.description}</p>
            <div
              class={['radial-progress absolute right-2 top-2 scale-75', `text-${section.color}-400`]}
              style={`--value:${sectionStats.value[index].percentage}; --size: 2.5rem; border: 2px solid rgba(255,255,255,0.05); shadow-lg`}
              role="progressbar">
              <span class="text-[10px] font-bold">{sectionStats.value[index].percentage}%</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
});
