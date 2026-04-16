import { component$, useComputed$ } from "@builder.io/qwik";

import { useLocalStorage } from "~/hooks/useLocalStorage";
import type { Checklist, Section } from '~/types/PSC';
import Icon from '~/components/core/icon';
import styles from './psc.module.css';

export default component$((props: { sections: Section[] }) => {

  // Get the IDs of completed and ignore items from local storage
  const [checked] = useLocalStorage('PSC_PROGRESS', {} as Record<string, boolean>);
  const [ignored] = useLocalStorage('PSC_IGNORED', {} as Record<string, boolean>);

  // Compute stats for all sections reactively
  const sectionStats = useComputed$(() => {
    const sections = Array.isArray(props.sections) ? props.sections : [];
    const id = (item: Checklist) => item.point.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    
    return sections.map(section => {
        const sectionItems = section.checklist || [];
        const total = sectionItems.filter((item) => !ignored.value[id(item)]).length;
        const countDone = sectionItems.filter((item) => checked.value[id(item)]).length;
        const percentage = total === 0 ? 0 : Math.round((countDone / total) * 100);
        
        return {
            done: countDone,
            total,
            itemsCount: sectionItems.length,
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
            {(sectionStats.value[index]?.done > 0) ? (
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
            {(sectionStats.value[index]?.done > 0) ? (
              <div
                class={['radial-progress absolute right-2 top-2 scale-75', `text-${section.color}-400`]}
                style={`--value:${sectionStats.value[index].percentage}; --size: 2.5rem; border: 2px solid rgba(255,255,255,0.05); shadow-lg`}
                role="progressbar">
                <span class="text-[10px] font-bold">{sectionStats.value[index].percentage}%</span>
              </div>
            ) : (
              <span class="absolute right-2 top-2 opacity-30 text-[10px] italic">
                Pendiente
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
});
