import { component$, useSignal } from '@builder.io/qwik';
import Icon from '~/components/core/icon';
import { translateKeys } from '~/utils/key-translator';

interface AdminEvidencesMatrixProps {
    latestReport: any;
    sections: any[];
}

export default component$<AdminEvidencesMatrixProps>(({ latestReport, sections }) => {
    const searchQuery = useSignal('');
    const selectedPhase = useSignal<string>('all');
    const selectedRow = useSignal<{ link: string; status: string } | null>(null);
    const showOnlyWithEvidence = useSignal<boolean>(true);

    const generateId = (title: string) => title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

    // 1. QUERY DE BACKEND / MAPEADO DE DATA
    const allItems: any[] = [];
    if (Array.isArray(sections)) {
        sections.forEach((sec: any) => {
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

    let checkedItems: Record<string, any> = {};
    let evidenceLinks: Record<string, string> = {};
    let ignoredItems: Record<string, boolean> = {};
    let progresoParcialDecimal: Record<string, number> = {};

    if (latestReport) {
        try {
            if (latestReport.data) {
                const parsed = translateKeys(JSON.parse(latestReport.data));
                checkedItems = parsed.checkedItems || parsed || {};
                evidenceLinks = parsed.evidenceLinks || {};
                ignoredItems = parsed.ignoredItems || {};
                progresoParcialDecimal = parsed.progresoParcialDecimal || {};
            }
            if (latestReport.progresoParcialDecimal) {
                const parsedCol = typeof latestReport.progresoParcialDecimal === 'string'
                    ? translateKeys(JSON.parse(latestReport.progresoParcialDecimal))
                    : translateKeys(latestReport.progresoParcialDecimal);
                progresoParcialDecimal = { ...progresoParcialDecimal, ...parsedCol };
            }
        } catch (e) {
            console.error('Error parsing report data:', e);
        }
    }

    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;
    
    // Contar hijos por cada prefijo de padre
    const parentChildrenCounts: Record<string, number> = {};
    const parentNormalizedPointIds: Record<string, string> = {};
    
    allItems.forEach(item => {
        const idNorma = item.id_norma;
        if (typeof idNorma === 'string' && idNorma.trim() !== '') {
            const match = idNorma.trim().match(SUB_ITEM_REGEX);
            if (match) {
                const parentPrefix = match[1];
                parentChildrenCounts[parentPrefix] = (parentChildrenCounts[parentPrefix] || 0) + 1;
            } else {
                const parentId = generateId(item.point);
                parentNormalizedPointIds[idNorma.trim()] = parentId;
            }
        }
    });

    // Transformamos los controles de la norma y aplicamos la fórmula de pesos
    const rows = allItems.map(item => {
        const itemId = generateId(item.point);
        const ignored = !!ignoredItems[itemId];
        const val = checkedItems[itemId];
        const numericVal = typeof val === 'boolean' ? (val ? 1.0 : 0.0) : (val ?? 0.0);
        
        let link = evidenceLinks[itemId] || '';
        const idNorma = item.id_norma || '';
        const match = idNorma.trim().match(SUB_ITEM_REGEX);
        let isInherited = false;
        if (!link && match) {
            const parentPrefix = match[1];
            if (parentChildrenCounts[parentPrefix] === 1) {
                const parentItemId = parentNormalizedPointIds[parentPrefix];
                if (parentItemId && evidenceLinks[parentItemId]) {
                    link = evidenceLinks[parentItemId];
                    isInherited = true;
                }
            }
        }
        
        let status = 'No Cumple';
        let statusColor = 'badge-error';
        if (ignored) {
            status = 'N/A';
            statusColor = 'badge-ghost';
        } else if (numericVal === 1.0) {
            status = 'Cumple';
            statusColor = 'badge-success text-white';
        } else if (numericVal === 0.5) {
            status = 'Parcial';
            statusColor = 'badge-warning text-white';
        }

        // Lógica de candado de Drive para aporte GPR
        const hasLink = !!link;
        let multiplier = 0.0;
        if (!ignored) {
            const partialVal = progresoParcialDecimal?.[itemId];
            const pValue = partialVal !== undefined && partialVal !== null
              ? Number(partialVal)
              : (numericVal === 0.5 ? 0.50 : (numericVal === 1.0 ? 1.00 : 0.00));

            if (numericVal === 1.0 || numericVal === 0.5) {
                multiplier = hasLink ? pValue : pValue * 0.4;
            }
        }
        
        const peso = Number(item.peso_gpr) || 0;
        const aporteReal = multiplier * peso;

        return {
            id_norma: item.id_norma || '',
            pregunta: item.point,
            id_dominio_egsi: item.id_dominio_egsi,
            peso_gpr: peso,
            status,
            statusColor,
            link,
            isInherited,
            aporteReal: ignored ? null : aporteReal,
            multiplier,
            ignored
        };
    });

    // 3. FILTRADO RÁPIDO EN FRONTEND
    const filteredRows = rows.filter(r => {
        const matchesSearch = r.id_norma.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                              r.pregunta.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesPhase = selectedPhase.value === 'all' || 
                              r.id_dominio_egsi?.toString() === selectedPhase.value;
        const matchesEvidence = !showOnlyWithEvidence.value || !!r.link;
        return matchesSearch && matchesPhase && matchesEvidence;
    });

    const getPhaseName = (id: number | undefined) => {
        switch(id) {
            case 6: return 'Planificación';
            case 7: return 'Ejecución';
            case 8: return 'Control';
            case 9: return 'Cierre';
            default: return 'No Homologado EGSI';
        }
    };

    return (
        <div class="bg-front rounded-xl border border-gray-800/50 shadow-lg p-6 relative">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-primary flex items-center gap-2">
                        <Icon icon="analytics" width={24} height={24} />
                        Matriz de Evidencias en Drive
                    </h2>
                    <p class="text-xs opacity-60 mt-1">Monitorea los enlaces cargados por el cliente y audita los aportes al avance GPR.</p>
                </div>

                {/* Filtros */}
                <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-300 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 hover:bg-gray-800 transition w-full sm:w-auto justify-between sm:justify-start">
                        <span class="text-xs font-medium">Solo con evidencia</span>
                        <input 
                            type="checkbox" 
                            checked={showOnlyWithEvidence.value}
                            onChange$={(e) => showOnlyWithEvidence.value = (e.target as HTMLInputElement).checked}
                            class="checkbox checkbox-primary checkbox-xs rounded border-gray-700"
                        />
                    </label>

                    <input 
                        type="text" 
                        placeholder="Buscar por código o control..." 
                        value={searchQuery.value}
                        onInput$={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
                        class="input input-bordered input-sm bg-gray-900 border-gray-800 text-sm w-full sm:w-64"
                    />
                    
                    <select 
                        value={selectedPhase.value}
                        onChange$={(e) => selectedPhase.value = (e.target as HTMLSelectElement).value}
                        class="select select-bordered select-sm bg-gray-900 border-gray-800 text-sm w-full sm:w-auto"
                    >
                        <option value="all">Todas las Fases EGSI</option>
                        <option value="6">Planificación (Fase 1)</option>
                        <option value="7">Ejecución (Fase 2)</option>
                        <option value="8">Control (Fase 3)</option>
                        <option value="9">Cierre (Fase 4)</option>
                    </select>
                </div>
            </div>

            {/* 2. ESTRUCTURA DE LA TABLA */}
            <div class="overflow-x-auto w-full rounded-lg border border-gray-800">
                <table class="table w-full bg-gray-900/40 text-gray-200">
                    <thead>
                        <tr class="bg-gray-900/80 text-gray-400 border-b border-gray-850">
                            <th class="w-24">Código</th>
                            <th>Control / Requisito</th>
                            <th class="w-32">Fase EGSI</th>
                            <th class="w-28 text-center">Estado</th>
                            <th class="w-36 text-center">Evidencia Drive</th>
                            <th class="w-36 text-right">Aporte GPR Real</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={6} class="text-center py-8 opacity-50 italic">
                                    No se encontraron registros que coincidan con la búsqueda.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row, idx) => (
                                <tr key={idx} class="hover:bg-gray-800/30 border-b border-gray-850/50 transition-colors">
                                    <td class="font-bold text-cyan-400">{row.id_norma}</td>
                                    <td class="max-w-md truncate whitespace-normal text-sm">{row.pregunta}</td>
                                    <td>
                                        <span class="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700/50">
                                            {getPhaseName(row.id_dominio_egsi)}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <span class={`badge badge-sm ${row.statusColor}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        {row.link ? (
                                            <div class="flex flex-col items-center gap-0.5 justify-center">
                                                <button 
                                                    onClick$={() => selectedRow.value = { link: row.link, status: row.status }}
                                                    class={[
                                                        "btn btn-xs gap-1 font-bold shadow-md text-white border-none",
                                                        row.status === 'No Cumple'
                                                            ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/10"
                                                            : (row.isInherited 
                                                                ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10" 
                                                                : "bg-purple-600 hover:bg-purple-700 shadow-purple-500/10")
                                                    ]}
                                                >
                                                    <Icon icon={row.status === 'No Cumple' ? "info" : "download"} width={12} height={12} />
                                                    {row.status === 'No Cumple' ? 'Ver Comentario' : 'Ver Evidencia'}
                                                </button>
                                                {row.isInherited && (
                                                    <span class="text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                                                        Heredado
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span class="text-red-500 font-bold text-xs italic">
                                                Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td class="text-right font-mono text-sm">
                                        {row.aporteReal === null ? (
                                            <span class="text-gray-500 font-bold">N/A</span>
                                        ) : (
                                            <span class={row.aporteReal > 0 ? 'text-green-400 font-bold' : 'text-gray-400'}>
                                                {row.aporteReal.toFixed(2)} <span class="text-xs opacity-50">/ {row.peso_gpr.toFixed(2)} pts</span>
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-4 flex justify-between items-center text-xs opacity-50">
                <p>Auditoría de cumplimiento ponderado GPR v3.0.</p>
                <p>Mostrando {filteredRows.length} controles.</p>
            </div>

            {/* Modal para ver la dirección de la evidencia / comentario */}
            {selectedRow.value && (
                <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div class="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick$={() => selectedRow.value = null}
                            class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <h3 class="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            {selectedRow.value.status === 'No Cumple' ? (
                                <>
                                    <Icon icon="info" class="text-orange-500" width={20} height={20} />
                                    Comentario de Incumplimiento
                                </>
                            ) : (
                                <>
                                    <Icon icon="info" class="text-purple-500" width={20} height={20} />
                                    Enlace de Evidencia Subida
                                </>
                            )}
                        </h3>
                        
                        <p class="text-xs opacity-60 mb-4">
                            {selectedRow.value.status === 'No Cumple' 
                                ? 'El comentario o justificación registrado para este control es:' 
                                : 'La dirección url registrada para este control es:'}
                        </p>
                        
                        <div class={[
                            "bg-gray-950 border border-gray-800 p-3 rounded-lg font-mono text-xs break-all select-all mb-4 select-text",
                            selectedRow.value.status === 'No Cumple' 
                                ? "text-orange-400 selection:bg-orange-600/30" 
                                : "text-purple-400 selection:bg-purple-600/30"
                        ]}>
                            {selectedRow.value.link}
                        </div>

                        <div class="flex justify-end gap-2">
                            <button 
                                onClick$={() => {
                                    navigator.clipboard.writeText(selectedRow.value?.link || '');
                                }}
                                class="btn btn-sm btn-ghost gap-1 text-xs"
                            >
                                Copiar {selectedRow.value.status === 'No Cumple' ? 'Texto' : 'Enlace'}
                            </button>
                            {selectedRow.value.link.trim().startsWith('http') && (
                                <a 
                                    href={selectedRow.value.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="btn btn-sm btn-primary text-xs"
                                >
                                    Abrir URL
                                </a>
                            )}
                            <button 
                                onClick$={() => selectedRow.value = null}
                                class="btn btn-sm btn-ghost text-xs"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
