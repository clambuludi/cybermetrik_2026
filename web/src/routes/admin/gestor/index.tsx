import { component$, useStore, $, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, z, zod$ } from '@builder.io/qwik-city';
import { verifyToken, COOKIE_NAME } from '~/utils/auth';
import type { DocumentHead } from '@builder.io/qwik-city';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define expected db schema interface
interface Pregunta {
    id: number;
    id_norma: string;
    dominio: string;
    tipo_control: string;
    version: string | null;
    pregunta: string;
    activo: number;
    id_dominio_egsi?: number | null;
    peso_gpr?: number | null;
}

export const useAdminPreguntas = routeLoader$(async ({ cookie, redirect }) => {
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) throw redirect(302, '/');
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') throw redirect(302, '/');

    try {
        let dbPath = path.resolve(process.cwd(), 'instance/cybermetrik.db');
        if (!fs.existsSync(dbPath)) {
            dbPath = path.resolve(process.cwd(), 'web/instance/cybermetrik.db');
        }
        if (!fs.existsSync(dbPath)) {
            dbPath = '/var/www/cybermetrik/web/instance/cybermetrik.db';
        }

        const sqlite = new Database(dbPath, { readonly: true });
        // Retrieve all questions (active and inactive) so the admin can manage them
        const rows = sqlite.prepare(`SELECT * FROM preguntas ORDER BY id ASC`).all() as Pregunta[];
        sqlite.close();
        return rows;
    } catch (e) {
        console.error("Error cargando preguntas desde cybermetrik.db:", e);
        return [];
    }
});

export const useSaveAdminPreguntas = routeAction$(async (data, { cookie }) => {
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) return { success: false, error: 'No autorizado' };
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') return { success: false, error: 'No autorizado' };

    try {
        let dbPath = path.resolve(process.cwd(), 'instance/cybermetrik.db');
        if (!fs.existsSync(dbPath)) {
            dbPath = path.resolve(process.cwd(), 'web/instance/cybermetrik.db');
        }
        if (!fs.existsSync(dbPath)) {
            dbPath = '/var/www/cybermetrik/web/instance/cybermetrik.db';
        }
        const sqlite = new Database(dbPath);
        
        const payloadObj = JSON.parse(data.payload);
        const updates = payloadObj.items as Pregunta[];
        const deletedIds = payloadObj.deletedIds as number[];
        
        const stmtUpdate = sqlite.prepare(`UPDATE preguntas SET id_norma = ?, dominio = ?, tipo_control = ?, pregunta = ?, activo = ?, id_dominio_egsi = ?, peso_gpr = ? WHERE id = ?`);
        const stmtInsert = sqlite.prepare(`INSERT INTO preguntas (id_norma, dominio, tipo_control, version, pregunta, activo, id_dominio_egsi, peso_gpr) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        const stmtDelete = sqlite.prepare(`DELETE FROM preguntas WHERE id = ?`);
        
        // Execute efficiently using bulk transaction
        const tx = sqlite.transaction((items: Pregunta[], toDelete: number[]) => {
            for (const item of items) {
                // Determine appropriate id_dominio_egsi if not set
                let egsiId = item.id_dominio_egsi;
                if (egsiId === undefined || egsiId === null) {
                    const dom = (item.dominio || '').toLowerCase();
                    if (dom.includes('planificación') || dom.includes('fase 1')) egsiId = 6;
                    else if (dom.includes('ejecución') || dom.includes('fase 2')) egsiId = 7;
                    else if (dom.includes('control') || dom.includes('fase 3')) egsiId = 8;
                    else if (dom.includes('cierre') || dom.includes('fase 4')) egsiId = 9;
                    else egsiId = 7; // default to 7 (ejecución)
                }

                const peso = item.peso_gpr !== undefined && item.peso_gpr !== null ? Number(item.peso_gpr) : 0.0;

                if (item.id < 0) {
                    stmtInsert.run(
                        item.id_norma || '', 
                        item.dominio || '', 
                        item.tipo_control || 'Nuevo Control', 
                        item.version || '2022', 
                        item.pregunta || '', 
                        item.activo,
                        egsiId,
                        peso
                    );
                } else {
                    stmtUpdate.run(
                        item.id_norma, 
                        item.dominio, 
                        item.tipo_control, 
                        item.pregunta, 
                        item.activo,
                        egsiId,
                        peso,
                        item.id
                    );
                }
            }
            if (toDelete && toDelete.length > 0) {
                for (const id of toDelete) {
                    // Solo intentar borrar si el ID es positivo (existe en la BD)
                    if (id > 0) stmtDelete.run(id);
                }
            }
        });
        
        tx(updates, deletedIds || []);
        sqlite.close();
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}, zod$({
    payload: z.string()
}));

export const useDeletePreguntaAction = routeAction$(async (data, { cookie }) => {
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) return { success: false, error: 'No autorizado' };
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') return { success: false, error: 'No autorizado' };

    try {
        const idNum = typeof data.id === 'string' ? parseInt(data.id, 10) : data.id;
        if (isNaN(idNum) || idNum <= 0) return { success: false, error: 'ID inválido' };
        
        let dbPath = path.resolve(process.cwd(), 'instance/cybermetrik.db');
        if (!fs.existsSync(dbPath)) {
            dbPath = path.resolve(process.cwd(), 'web/instance/cybermetrik.db');
        }
        if (!fs.existsSync(dbPath)) {
            dbPath = '/var/www/cybermetrik/web/instance/cybermetrik.db';
        }
        const sqlite = new Database(dbPath);
        const result = sqlite.prepare('DELETE FROM preguntas WHERE id = ?').run(idNum);
        sqlite.close();
        console.log(`[DELETE] Eliminada pregunta id=${idNum}, changes=${result.changes}`);
        return { success: true, deleted: result.changes };
    } catch (e: any) {
        console.error('[DELETE] Error:', e.message);
        return { success: false, error: e.message };
    }
}, zod$({ id: z.union([z.number(), z.string()]) }));

export default component$(() => {
    const loaderData = useAdminPreguntas();
    const saveAction = useSaveAdminPreguntas();
    const deletePreguntaAction = useDeletePreguntaAction();

    // SUB_ITEM_REGEX: id_norma ends with a digit-group + optional dot + single lowercase letter
    // Matches: 9.1a, A.5.1.a, A.5.1.b — does NOT match: A.5.1, A.5.10, 9.1
    const SUB_ITEM_REGEX = /^(.+?\d+)\.?([a-z])$/;

    const state = useStore({
        items: [] as Pregunta[],
        deletedIds: [] as number[],
        searchTerm: '',
        expandedDomains: {} as Record<string, boolean>,
        expandedParents: {} as Record<string, boolean>,
    });

    useVisibleTask$(({ track }) => {
        track(() => loaderData.value);
        if (loaderData.value) {
            state.items = JSON.parse(JSON.stringify(loaderData.value));
            // Auto-expand first domain
            const firstDomain = state.items[0]?.dominio || '';
            if (firstDomain && !Object.keys(state.expandedDomains).length) {
                state.expandedDomains[firstDomain] = true;
            }
        }
    });

    const handleSave = $(async () => {
        await saveAction.submit({ payload: JSON.stringify({ items: state.items, deletedIds: state.deletedIds }) });
        if (saveAction.value?.success) {
            window.location.reload();
        } else {
            setTimeout(() => {
                alert(saveAction.value?.error ? 'Error: ' + saveAction.value.error : '¡Actualizados!');
                if (!saveAction.value?.error) window.location.reload();
            }, 500);
        }
    });

    // Delete function: receives a primitive number id
    const doDelete = $(async (idNum: number) => {
        if (!confirm('¿Estás seguro de eliminar este ítem? Esta acción no se puede deshacer.')) return;
        // Optimistic: remove from UI immediately
        state.items = state.items.filter(item => item.id !== idNum);
        if (idNum > 0) {
            // Delete from database on the server
            const result = (await deletePreguntaAction.submit({ id: idNum })) as any;
            if (result.success) {
                console.log('Eliminado correctamente id=' + idNum);
            } else {
                alert('Error al eliminar: ' + (result.error || 'desconocido'));
                // Reload to restore state on error
                window.location.reload();
            }
        }
    });

    // Add a new child row right after the last sibling of a given parent
    const handleAddChild = $((parentIdNorma: string, dominio: string, tipoControl: string, egsiId: number | null | undefined) => {
        const siblingRegex = new RegExp(`^${parentIdNorma.replace(/\./g, '\\.')}[\\.\\-]?[a-z]$`);
        const siblings = state.items.filter(i => siblingRegex.test(i.id_norma || ''));

        let nextLetter = 'a';
        if (siblings.length > 0) {
            const sorted = [...siblings].sort((a, b) => (a.id_norma || '').localeCompare(b.id_norma || ''));
            const last = sorted[sorted.length - 1].id_norma || '';
            const m = last.match(/([a-z])$/);
            if (m) nextLetter = String.fromCharCode(m[1].charCodeAt(0) + 1);
        }

        const newIdNorma = `${parentIdNorma}.${nextLetter}`;
        const newId = -1 * (state.items.filter(i => i.id < 0).length + 1);

        const newItem: Pregunta = {
            id: newId, id_norma: newIdNorma, dominio, tipo_control: tipoControl,
            version: '2022', pregunta: '', activo: 1,
            id_dominio_egsi: egsiId || 7, peso_gpr: 0.43
        };

        // Insert after last sibling or after parent
        let insertAfter = state.items.findIndex(i => i.id_norma === parentIdNorma);
        if (siblings.length > 0) {
            const sorted = [...siblings].sort((a, b) => (a.id_norma || '').localeCompare(b.id_norma || ''));
            const lastSibIdx = state.items.findIndex(i => i.id === sorted[sorted.length - 1].id);
            if (lastSibIdx > insertAfter) insertAfter = lastSibIdx;
        }

        const newItems = [...state.items];
        newItems.splice(insertAfter + 1, 0, newItem);
        state.items = newItems;
        state.expandedDomains[dominio] = true;
        state.expandedParents[parentIdNorma] = true;
    });

    // Build grouped structure: domain → { parents: Pregunta[], children: Record<string, Pregunta[]>, flat: Pregunta[] }
    const searchLower = state.searchTerm.toLowerCase();
    const filteredItems = state.items.filter(item =>
        item.id < 0 ||
        (item.pregunta || '').toLowerCase().includes(searchLower) ||
        (item.id_norma || '').toLowerCase().includes(searchLower) ||
        (item.dominio || '').toLowerCase().includes(searchLower)
    );

    // Group by domain
    const domainMap: Record<string, { parents: Pregunta[]; childrenOf: Record<string, Pregunta[]>; flat: Pregunta[] }> = {};
    filteredItems.forEach(item => {
        const dom = item.dominio || 'General';
        if (!domainMap[dom]) domainMap[dom] = { parents: [], childrenOf: {}, flat: [] };
        const m = (item.id_norma || '').match(SUB_ITEM_REGEX);
        if (m) {
            const parentId = m[1];
            if (!domainMap[dom].childrenOf[parentId]) domainMap[dom].childrenOf[parentId] = [];
            domainMap[dom].childrenOf[parentId].push(item);
        } else {
            domainMap[dom].parents.push(item);
        }
    });

    const domainKeys = Object.keys(domainMap).sort((a, b) => a.localeCompare(b));

    return (
        <div class="max-w-7xl mx-auto p-6 mt-8">
            {/* Header */}
            <div class="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
                <div>
                    <h1 class="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Gestor de Controles ISO
                    </h1>
                    <p class="opacity-60 mt-1">Administra la jerarquía de controles y sus sub-ítems de auditoría.</p>
                </div>
                <div class="flex flex-wrap gap-2 justify-end">
                    <a href="/admin" class="btn btn-outline border-gray-600 text-gray-300">← Dashboard</a>
                    <button onClick$={handleSave} class="btn btn-primary shadow-lg shadow-cyan-500/20" disabled={saveAction.isRunning}>
                        {saveAction.isRunning ? <span class="loading loading-spinner" /> : '💾 Guardar en BD'}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div class="bg-gray-900/60 rounded-xl border border-gray-800 p-4 mb-6">
                <input
                    type="text"
                    placeholder="Buscar por ID (ej. A.5.1), dominio o texto del control..."
                    class="input input-bordered w-full bg-gray-950 border-gray-700 focus:border-cyan-500 font-medium"
                    value={state.searchTerm}
                    onInput$={(e) => state.searchTerm = (e.target as HTMLInputElement).value}
                />
            </div>

            {/* Domain Accordions */}
            <div class="flex flex-col gap-4">
                {domainKeys.map(domKey => {
                    const { parents, childrenOf } = domainMap[domKey];
                    const isDomExpanded = state.searchTerm !== '' || state.expandedDomains[domKey];
                    const totalControls = filteredItems.filter(i => (i.dominio || 'General') === domKey).length;

                    return (
                        <div key={domKey} class="rounded-2xl border border-gray-700/60 bg-gray-900/50 overflow-hidden shadow-lg">
                            {/* Domain Header */}
                            <div
                                class="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-800/60 transition-colors bg-gray-800/40"
                                onClick$={() => state.expandedDomains[domKey] = !state.expandedDomains[domKey]}
                            >
                                <div class="flex items-center gap-3">
                                    <span class="text-lg font-black text-cyan-400">{isDomExpanded ? '▼' : '▶'}</span>
                                    <span class="text-lg font-black text-white">{domKey}</span>
                                    <span class="badge badge-outline badge-info text-xs">{totalControls} controles</span>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-xs btn-outline border-cyan-600 text-cyan-400 hover:bg-cyan-900"
                                    onClick$={(e) => {
                                        e.stopPropagation();
                                        const newId = -1 * (state.items.filter(i => i.id < 0).length + 1);
                                        const newItems = [...state.items, {
                                            id: newId, id_norma: '', dominio: domKey,
                                            tipo_control: 'Nuevo Control', version: '2022',
                                            pregunta: '', activo: 1, id_dominio_egsi: 7, peso_gpr: 0.43
                                        }];
                                        state.items = newItems;
                                        state.expandedDomains[domKey] = true;
                                    }}
                                >
                                    + Control Plano
                                </button>
                            </div>

                            {/* Domain Content */}
                            {isDomExpanded && (
                                <div class="px-4 py-3 flex flex-col gap-3">
                                    {parents.map(parent => {
                                        const parentIdNorma = parent.id_norma || '';
                                        const children = childrenOf[parentIdNorma] || [];
                                        const hasChildren = children.length > 0;
                                        const isParentExpanded = state.searchTerm !== '' || state.expandedParents[parentIdNorma] || false;
                                        const realIndex = state.items.findIndex(i => i.id === parent.id);

                                        return (
                                            <div key={parent.id} class={`rounded-xl border transition-all duration-200 ${hasChildren ? 'border-cyan-800/50 bg-gray-800/30' : 'border-gray-700/40 bg-gray-800/20'}`}>
                                                {/* Parent Row */}
                                                <div class="flex items-start gap-3 p-4">
                                                    {/* Expand toggle (only if has children) */}
                                                    {hasChildren ? (
                                                        <button
                                                            type="button"
                                                            class="btn btn-xs btn-ghost text-cyan-400 mt-1 shrink-0"
                                                            onClick$={() => state.expandedParents[parentIdNorma] = !isParentExpanded}
                                                        >
                                                            {isParentExpanded ? '▼' : '▶'}
                                                        </button>
                                                    ) : (
                                                        <span class="w-7 shrink-0" />
                                                    )}

                                                    {/* ID Norma */}
                                                    <div class="shrink-0 w-28">
                                                        {realIndex !== -1 ? (
                                                            <input
                                                                type="text"
                                                                class="input input-bordered input-sm w-full font-black text-cyan-400 bg-gray-900 border-gray-600 focus:border-cyan-500"
                                                                value={state.items[realIndex].id_norma}
                                                                onInput$={(e) => state.items[realIndex].id_norma = (e.target as HTMLInputElement).value}
                                                            />
                                                        ) : (
                                                            <span class="font-black text-cyan-400 text-sm">{parentIdNorma}</span>
                                                        )}
                                                        {hasChildren && (
                                                            <div class="mt-1 text-[9px] text-cyan-600 font-bold uppercase tracking-wider">
                                                                {children.length} sub-ítem{children.length !== 1 ? 's' : ''}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Pregunta / Punto */}
                                                    <div class="flex-1">
                                                        {realIndex !== -1 ? (
                                                            <textarea
                                                                class="textarea textarea-bordered textarea-sm w-full h-14 leading-snug bg-gray-900 border-gray-600 focus:border-cyan-500 font-medium"
                                                                placeholder="Texto del control principal..."
                                                                value={state.items[realIndex].pregunta}
                                                                onInput$={(e) => state.items[realIndex].pregunta = (e.target as HTMLTextAreaElement).value}
                                                            />
                                                        ) : (
                                                            <span class="font-medium text-sm">{parent.pregunta}</span>
                                                        )}
                                                    </div>

                                                    {/* Peso GPR */}
                                                    <div class="shrink-0 w-20">
                                                        <label class="text-[9px] text-gray-500 uppercase font-bold">Peso GPR</label>
                                                        {realIndex !== -1 ? (
                                                            <input
                                                                type="number" step="0.01"
                                                                class="input input-bordered input-xs w-full text-center font-mono text-cyan-400 bg-gray-900 border-gray-600"
                                                                value={state.items[realIndex].peso_gpr || 0}
                                                                onInput$={(e) => state.items[realIndex].peso_gpr = parseFloat((e.target as HTMLInputElement).value) || 0}
                                                            />
                                                        ) : null}
                                                    </div>

                                                    {/* Visible toggle */}
                                                    <div class="shrink-0 flex flex-col items-center gap-1">
                                                        <label class="text-[9px] text-gray-500 uppercase font-bold">Activo</label>
                                                        {realIndex !== -1 ? (
                                                            <input
                                                                type="checkbox"
                                                                class="toggle toggle-success toggle-sm"
                                                                checked={state.items[realIndex].activo === 1}
                                                                onChange$={() => state.items[realIndex].activo = state.items[realIndex].activo === 1 ? 0 : 1}
                                                            />
                                                        ) : null}
                                                    </div>

                                                    {/* Actions */}
                                                    <div class="shrink-0 flex flex-col gap-1.5">
                                                        <button
                                                            type="button"
                                                            class="btn btn-xs btn-outline border-cyan-700 text-cyan-300 hover:bg-cyan-900/40 whitespace-nowrap"
                                                            onClick$={() => handleAddChild(parentIdNorma, domKey, parent.tipo_control || 'Control', parent.id_dominio_egsi)}
                                                        >
                                                            + Sub-ítem
                                                        </button>
                                                        {(() => {
                                                            const pid = parent.id as number;
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    class="btn btn-xs btn-ghost text-red-400 hover:bg-red-900/30"
                                                                    onClick$={() => doDelete(pid)}
                                                                >
                                                                    🗑 Eliminar
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Children */}
                                                {hasChildren && isParentExpanded && (
                                                    <div class="border-t border-cyan-800/30 bg-gray-900/40 px-4 py-3 flex flex-col gap-2">
                                                        <div class="flex items-center gap-2 mb-1">
                                                            <span class="text-xs text-cyan-600 font-bold uppercase tracking-wider">Sub-ítems de {parentIdNorma}</span>
                                                        </div>
                                                        {children.map(child => {
                                                            const cIdx = state.items.findIndex(i => i.id === child.id);
                                                            // Extract primitives BEFORE the onClick$ closure — Qwik cannot serialize reactive proxy objects
                                                            const childId = child.id as number;
                                                            const childIdNorma = child.id_norma as string;
                                                            return (
                                                                <div key={child.id} class="flex items-start gap-3 bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/30 ml-4">
                                                                    <span class="text-cyan-700 font-bold text-sm mt-2 shrink-0">↳</span>

                                                                    {/* Child ID */}
                                                                    <div class="shrink-0 w-28">
                                                                        {cIdx !== -1 ? (
                                                                            <input
                                                                                type="text"
                                                                                class="input input-bordered input-xs w-full font-bold text-cyan-300 bg-gray-900 border-gray-700"
                                                                                value={state.items[cIdx].id_norma}
                                                                                onInput$={(e) => state.items[cIdx].id_norma = (e.target as HTMLInputElement).value}
                                                                            />
                                                                        ) : <span class="text-cyan-300 text-xs font-bold">{childIdNorma}</span>}
                                                                    </div>

                                                                    {/* Child Pregunta */}
                                                                    <div class="flex-1">
                                                                        {cIdx !== -1 ? (
                                                                            <textarea
                                                                                class="textarea textarea-bordered textarea-xs w-full h-12 leading-snug bg-gray-900 border-gray-700 focus:border-cyan-500 text-sm"
                                                                                placeholder="Pregunta de auditoría del sub-ítem..."
                                                                                value={state.items[cIdx].pregunta}
                                                                                onInput$={(e) => state.items[cIdx].pregunta = (e.target as HTMLTextAreaElement).value}
                                                                            />
                                                                        ) : <span class="text-sm">{child.pregunta}</span>}
                                                                    </div>

                                                                    {/* Peso badge */}
                                                                    <div class="shrink-0 flex flex-col items-center gap-0.5 mt-1">
                                                                        <span class="text-[8px] text-gray-500 uppercase font-bold">GPR</span>
                                                                        <span class="badge badge-sm bg-cyan-900/50 border-cyan-700 text-cyan-300 font-mono font-bold">
                                                                            {cIdx !== -1 ? (state.items[cIdx].peso_gpr || 0.43).toFixed(2) : '0.43'}%
                                                                        </span>
                                                                    </div>

                                                                    {/* Child activo */}
                                                                    <div class="shrink-0 flex flex-col items-center gap-0.5 mt-1">
                                                                        <span class="text-[8px] text-gray-500 uppercase font-bold">Activo</span>
                                                                        {cIdx !== -1 ? (
                                                                            <input
                                                                                type="checkbox"
                                                                                class="toggle toggle-success toggle-xs"
                                                                                checked={state.items[cIdx].activo === 1}
                                                                                onChange$={() => state.items[cIdx].activo = state.items[cIdx].activo === 1 ? 0 : 1}
                                                                            />
                                                                        ) : null}
                                                                    </div>

                                                                    {/* Delete child */}
                                                                    <button
                                                                        type="button"
                                                                        class="btn btn-ghost btn-xs text-red-400 hover:bg-red-900/30 mt-1"
                                                                        onClick$={() => doDelete(childId)}
                                                                    >🗑 Borrar</button>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Add child button inside expanded parent */}
                                                        <button
                                                            type="button"
                                                            class="btn btn-xs btn-outline border-dashed border-cyan-700 text-cyan-500 hover:bg-cyan-900/30 ml-4 mt-1 w-fit"
                                                            onClick$={() => handleAddChild(parentIdNorma, domKey, parent.tipo_control || 'Control', parent.id_dominio_egsi)}
                                                        >
                                                            + Agregar Sub-ítem
                                                        </button>
                                                    </div>
                                                )}

                                                {/* If no children yet, show add button inline */}
                                                {!hasChildren && (
                                                    <div class="px-4 pb-3 ml-10">
                                                        <button
                                                            type="button"
                                                            class="btn btn-xs btn-ghost border-dashed border border-cyan-900 text-cyan-700 hover:bg-cyan-900/20 hover:text-cyan-400"
                                                            onClick$={() => handleAddChild(parentIdNorma, domKey, parent.tipo_control || 'Control', parent.id_dominio_egsi)}
                                                        >
                                                            + Agregar primer Sub-ítem
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Orphan children (children without matching parent in this view) */}
                                    {Object.entries(domainMap[domKey].childrenOf).filter(([pid]) =>
                                        !parents.find(p => p.id_norma === pid)
                                    ).flatMap(([, kids]) => kids).map(orphan => {
                                        const oIdx = state.items.findIndex(i => i.id === orphan.id);
                                        return (
                                            <div key={orphan.id} class="flex items-center gap-3 rounded-xl border border-gray-700/40 bg-gray-800/20 p-3">
                                                <span class="text-yellow-600 text-xs font-bold shrink-0 ml-2">↳ huérfano</span>
                                                <span class="font-mono text-xs text-yellow-400 shrink-0 w-24">{orphan.id_norma}</span>
                                                <span class="text-xs flex-1 opacity-70">{orphan.pregunta?.substring(0, 80)}</span>
                                                    {(() => {
                                                        const oid = orphan.id as number;
                                                        return (
                                                            <button
                                                                type="button"
                                                                class="btn btn-ghost btn-xs text-red-400"
                                                                onClick$={() => doDelete(oid)}
                                                            >
                                                                🗑
                                                            </button>
                                                        );
                                                    })()}
                                            </div>
                                        );
                                    })}

                                    {parents.length === 0 && Object.keys(domainMap[domKey].childrenOf).length === 0 && (
                                        <p class="text-center text-gray-600 py-4 text-sm">Sin controles en este dominio.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {domainKeys.length === 0 && (
                    <div class="text-center py-16 text-gray-500">
                        No se encontraron controles con tu búsqueda.
                    </div>
                )}
            </div>
        </div>
    );
});

export const head: DocumentHead = {
    title: 'Gestor de Controles ISO — CyberMetrik',
};
