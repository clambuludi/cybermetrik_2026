import { component$, useSignal, useContext } from '@builder.io/qwik';
import { ChecklistContext } from '~/store/checklist-context';
import { ProgressContext } from '~/store/progress-context';
import Icon from '~/components/core/icon';
import { calcularPuntajesConsistentes } from '~/utils/madurez';

export default component$(() => {
    const checklists = useContext(ChecklistContext);
    const progress = useContext(ProgressContext);
    const activeNorm = useSignal<'ISO' | 'EGSI'>('ISO');

    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

    // Flatten items from all sections for processing
    const allItems: any[] = [];
    if (Array.isArray(checklists?.value)) {
        checklists.value.forEach((sec: any) => {
            if (Array.isArray(sec.checklist)) {
                sec.checklist.forEach((item: any) => {
                    allItems.push({
                        ...item,
                        sectionTitle: sec.title
                    });
                });
            }
        });
    }

    // Calcula el puntaje de un grupo de controles
    // ISO usa promedio simple. EGSI usa suma ponderada según Matriz GPR.
    const calculateScore = (items: any[], isEgsi: boolean) => {
        let totalScore = 0;
        let validItems = 0;
        
        let obtainedGPRPoints = 0;
        let totalGPRWeight = 0;

        const isFase2 = items.length > 0 && Number(items[0].id_dominio_egsi) === 7;

        items.forEach(item => {
            const id = generateId(item.point);
            if (progress.ignored[id] && !isFase2) return; // Saltamos "No Aplica"
            validItems++;

            const val = progress.completed[id];
            // Normalize values: boolean true -> 1.0, false -> 0.0, else number
            const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
            
            // Requisito mandatorio de Evidencia (Drive link)
            const hasLink = !!progress.evidenceLinks[id];

            const partialVal = progress.progresoParcialDecimal?.[id];
            const pValue = partialVal !== undefined && partialVal !== null
              ? Number(partialVal)
              : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

            let finalScore = 0.0;
            if (numericVal === 1.0 || numericVal === 0.5) {
                finalScore = hasLink ? pValue : pValue * 0.4;
            }

            if (isEgsi && !isFase2) {
                const peso = Number(item.peso_gpr) || 0;
                obtainedGPRPoints += finalScore * peso;
                totalGPRWeight += peso;
            } else {
                totalScore += finalScore;
            }
        });

        if (isFase2) {
            return Math.round((totalScore / 133) * 100);
        }

        if (isEgsi) {
            if (totalGPRWeight === 0) return 0;
            return Math.round((obtainedGPRPoints / totalGPRWeight) * 100);
        } else {
            if (validItems === 0) return 0;
            return Math.round((totalScore / validItems) * 100);
        }
    };

    let renderGroups: { title: string; score: number; color: string }[] = [];

    if (activeNorm.value === 'ISO') {
        const stats = calcularPuntajesConsistentes((checklists as any)?.value || [], progress as any);
        const getGroupScore = (dom: string) => {
            if (dom.includes('A5')) return Math.round(stats.a5Score);
            if (dom.includes('A6')) return Math.round(stats.a6Score);
            if (dom.includes('A7')) return Math.round(stats.a7Score);
            if (dom.includes('A8')) return Math.round(stats.a8Score);
            if (dom.includes('Cláusulas')) return Math.round(stats.clausesScore);
            return 0;
        };

        const isoGroups = [
            'A5: Controles Organizacionales',
            'A6: Controles Personales',
            'A7: Controles Físico',
            'A8: Controles Tecnologicos',
            'Cláusulas ISO 27001'
        ];
        renderGroups = isoGroups.map(dom => {
            return {
                title: dom,
                score: getGroupScore(dom),
                color: 'primary' // Tarjetas moradas clásicas
            };
        });
    } else {
        const egsiGroups = [
            { id: 6, title: 'EGSI FASE 1: PLANIFICACIÓN' },
            { id: 7, title: 'EGSI FASE 2: EJECUCIÓN' },
            { id: 8, title: 'EGSI FASE 3: CONTROL (EVALUACIÓN)' },
            { id: 9, title: 'EGSI FASE 4: CIERRE (MEJORA)' }
        ];

        renderGroups = egsiGroups.map(g => {
            const items = allItems.filter(i => i.id_dominio_egsi === g.id);
            const score = calculateScore(items, true);
            return {
                title: g.title,
                score,
                color: score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error'
            };
        });
    }

    return (
        <div class="w-full bg-front border border-gray-800 rounded-xl p-6 shadow-xl mb-8">
            <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                    <Icon icon="analytics" width={28} height={28} class={activeNorm.value === 'ISO' ? 'text-primary' : 'text-secondary'} />
                    Panel de cumplimiento
                </h2>
                
                {/* Toggle de Norma */}
                <div class="join bg-gray-900 border border-gray-700 rounded-lg p-1">
                    <button 
                        onClick$={() => activeNorm.value = 'ISO'}
                        class={`join-item btn btn-sm border-none transition-all ${activeNorm.value === 'ISO' ? 'bg-primary text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}`}
                    >
                        ISO 27001
                    </button>
                    <button 
                        onClick$={() => activeNorm.value = 'EGSI'}
                        class={`join-item btn btn-sm border-none transition-all ${activeNorm.value === 'EGSI' ? 'bg-secondary text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}`}
                    >
                        EGSI v3.0
                    </button>
                </div>
            </div>

            {/* Tarjetas de Dominios/Fases */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {renderGroups.map(group => (
                    <div key={group.title} class="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-colors">
                        <div class="flex justify-between items-center mb-4 gap-2">
                            <h3 class="font-semibold text-gray-200 text-sm leading-tight h-10 flex items-center">{group.title}</h3>
                            <div class={`radial-progress text-sm text-${group.color} font-black flex-shrink-0`} 
                                 style={`--value:${group.score}; --size: 3.5rem; --thickness: 5px;`}
                            >
                                {group.score}%
                            </div>
                        </div>
                        <progress 
                            class={`progress w-full progress-${group.color}`} 
                            value={group.score} 
                            max="100"
                        ></progress>
                    </div>
                ))}
            </div>
            
            {activeNorm.value === 'EGSI' && (
                <div class="mt-6 text-center text-xs opacity-60 italic text-gray-400">
                    <p>* El nivel de madurez EGSI se calcula considerando los controles gubernamentales mandatorios según el GPR.</p>
                </div>
            )}
        </div>
    );
});
