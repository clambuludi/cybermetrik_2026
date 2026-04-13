import { component$, useStore, $, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, z, zod$ } from '@builder.io/qwik-city';
import { db } from '~/db';
import { appConfig } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken, COOKIE_NAME } from '~/utils/auth';
import jsyaml from 'js-yaml';
import type { DocumentHead } from '@builder.io/qwik-city';
import type { Sections } from '~/types/PSC';

// Fetch the checklist: try DB first, then fallback to GitHub YAML
export const useChecklistConfig = routeLoader$(async ({ cookie, redirect }) => {
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) throw redirect(302, '/');
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') throw redirect(302, '/');

    const config = await db.select().from(appConfig).where(eq(appConfig.key, 'global_checklist')).limit(1);

    if (config.length > 0) {
        try {
            return JSON.parse(config[0].value) as Sections;
        } catch (e) {
            console.error("Error parsing DB checklist config:", e);
        }
    }

    // Fallback
    const remoteUrl = 'https://raw.githubusercontent.com/Lissy93/personal-security-checklist/HEAD/personal-security-checklist.yml';
    try {
        const res = await fetch(remoteUrl);
        const text = await res.text();
        return jsyaml.load(text) as Sections;
    } catch (e) {
        return [];
    }
});

// Action to save the updated JSON tree back to the database
export const useSaveChecklistConfig = routeAction$(async (data, { cookie }) => {
    const token = cookie.get(COOKIE_NAME)?.value;
    if (!token) return { success: false, error: 'No autorizado' };
    const session = verifyToken(token);
    if (!session || session.role !== 'admin') return { success: false, error: 'No autorizado' };

    try {
        const jsonStr = data.checklistData;
        const exists = await db.select().from(appConfig).where(eq(appConfig.key, 'global_checklist')).limit(1);

        if (exists.length > 0) {
            await db.update(appConfig).set({ value: jsonStr as string }).where(eq(appConfig.key, 'global_checklist'));
        } else {
            await db.insert(appConfig).values({ key: 'global_checklist', value: jsonStr as string });
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to save checklist:', error);
        return { success: false, error: 'Fallo al guardar la configuración' };
    }
}, zod$({
    checklistData: z.string()
}));

export default component$(() => {
    const loaderData = useChecklistConfig();
    const saveAction = useSaveChecklistConfig();

    const state = useStore({
        sections: [] as Sections,
        isEditingJson: false,
        rawJson: ''
    });

    // Initialize from loader
    useVisibleTask$(({ track }) => {
        track(() => loaderData.value);
        if (loaderData.value) {
            state.sections = JSON.parse(JSON.stringify(loaderData.value)); // deep copy
            state.rawJson = JSON.stringify(loaderData.value, null, 2);
        }
    });

    // Handle JSON Edit
    const applyJson = $(() => {
        try {
            state.sections = JSON.parse(state.rawJson);
            state.isEditingJson = false;
        } catch (e) {
            alert("Error de formato JSON. Revisa la sintaxis e intenta de nuevo.");
        }
    });

    // Structure helpers
    const addSection = $(() => {
        state.sections.push({ title: 'Nueva Categoría', intro: '', slug: `cat-${Date.now()}`, description: '', icon: 'shield', color: 'blue', checklist: [] });
    });

    const addQuestion = $((sectionIndex: number) => {
        if (!state.sections[sectionIndex].checklist) {
            state.sections[sectionIndex].checklist = [];
        }
        state.sections[sectionIndex].checklist.push({ point: 'Nueva Tarea', priority: 'optional', details: 'Descripción ampliada...', hidden: false });
    });

    const removeSection = $((index: number) => {
        if (confirm("¿Seguro que deseas eliminar esta categoría con todas sus preguntas?")) {
            state.sections.splice(index, 1);
        }
    });

    const removeQuestion = $((sectionIndex: number, qIndex: number) => {
        if (confirm("¿Eliminar esta pregunta?")) {
            state.sections[sectionIndex].checklist.splice(qIndex, 1);
        }
    });

    const handleSave = $(async () => {
        const payload = JSON.stringify(state.sections);
        await saveAction.submit({ checklistData: payload });
        if (saveAction.value?.success) {
            alert("¡Configuración guardada exitosamente!");
        } else if (saveAction.value?.error) {
            alert("Error: " + saveAction.value.error);
        } else {
            // If action completes but no direct return picked up synchronously
            setTimeout(() => alert("¡Configuración guardada exitosamente!"), 500);
        }
    });

    return (
        <div class="max-w-6xl mx-auto p-6 mt-8">
            <div class="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
                <div>
                    <h1 class="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Gestor de Preguntas
                    </h1>
                    <p class="opacity-60 mt-1">Configura las preguntas que tus clientes verán en su checklist.</p>
                </div>
                <div class="flex gap-2">
                    <a href="/admin" class="btn btn-outline border-gray-600 text-gray-300">
                        Volver
                    </a>
                    <button onClick$={handleSave} class="btn btn-primary shadow-lg shadow-cyan-500/20" disabled={saveAction.isRunning}>
                        {saveAction.isRunning ? <span class="loading loading-spinner"></span> : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            <div class="bg-front rounded-xl shadow-lg border border-gray-800/50 p-6 mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Modo de Edición</h2>
                    <div class="tabs tabs-boxed bg-gray-900 border border-gray-800">
                        <button class={`tab ${!state.isEditingJson ? 'tab-active' : ''}`} onClick$={() => state.isEditingJson = false}>Visual</button>
                        <button class={`tab ${state.isEditingJson ? 'tab-active' : ''}`} onClick$={() => {
                            state.rawJson = JSON.stringify(state.sections, null, 2);
                            state.isEditingJson = true;
                        }}>Raw JSON</button>
                    </div>
                </div>

                {state.isEditingJson ? (
                    <div>
                        <p class="text-sm opacity-60 mb-2">Edita la matriz de datos directamente en formato JSON. Ten mucho cuidado con comas o comillas faltantes para no romper el formato.</p>
                        <textarea
                            class="w-full h-96 p-4 font-mono text-sm bg-gray-900 rounded-box border border-gray-700 outline-none focus:border-cyan-500 text-green-400"
                            value={state.rawJson}
                            onInput$={(e) => state.rawJson = (e.target as HTMLTextAreaElement).value}
                        />
                        <button onClick$={applyJson} class="btn btn-secondary mt-4">Aplicar y Volver a Visual</button>
                    </div>
                ) : (
                    <div class="space-y-6">
                        {state.sections.map((section, sIndex) => (
                            <div key={sIndex} class="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                                <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4 pb-4 border-b border-gray-700">
                                    <div class="flex-1 space-y-2 w-full">
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold opacity-50 w-24">Categoría:</span>
                                            <input
                                                class="input input-bordered input-sm flex-1 bg-gray-900"
                                                value={section.title}
                                                onInput$={(e) => section.title = (e.target as HTMLInputElement).value}
                                            />
                                            <label class="flex items-center gap-2 cursor-pointer ml-4">
                                                <span class="text-xs font-bold opacity-50">Visible:</span>
                                                <input 
                                                    type="checkbox" 
                                                    class="toggle toggle-success toggle-sm" 
                                                    checked={!section.hidden}
                                                    onChange$={() => section.hidden = !section.hidden}
                                                />
                                            </label>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold opacity-50 w-24">Intro:</span>
                                            <input
                                                class="input input-bordered input-sm flex-1 bg-gray-900"
                                                value={section.intro}
                                                onInput$={(e) => section.intro = (e.target as HTMLInputElement).value}
                                                placeholder="(Opcional) Descripción de la categoría"
                                            />
                                        </div>
                                    </div>
                                    <button onClick$={() => removeSection(sIndex)} class="btn btn-sm btn-error btn-outline mt-2 sm:mt-0">
                                        Eliminar Categoría
                                    </button>
                                </div>

                                <div class="space-y-3 pl-4 sm:pl-8">
                                    <h4 class="font-bold text-sm opacity-60">Lista de Tareas ({section.checklist ? section.checklist.length : 0})</h4>
                                    {(section.checklist || []).map((item, qIndex) => (
                                        <div key={qIndex} class="bg-gray-900 rounded p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center border border-gray-800">
                                            <div class="flex-1 space-y-2 w-full">
                                                <div class="flex items-center gap-3">
                                                    <input
                                                        class="input input-bordered input-sm flex-1 font-bold"
                                                        value={item.point}
                                                        onInput$={(e) => {
                                                            const val = (e.target as HTMLInputElement).value;
                                                            item.point = val;
                                                        }}
                                                        placeholder="Nombre de la tarea (ej: Usar contraseñas fuertes)"
                                                    />
                                                    <label class="flex items-center gap-2 cursor-pointer">
                                                        <span class="text-[10px] uppercase font-black opacity-40">Mostrar:</span>
                                                        <input 
                                                            type="checkbox" 
                                                            class="toggle toggle-primary toggle-xs" 
                                                            checked={!item.hidden}
                                                            onChange$={() => item.hidden = !item.hidden}
                                                        />
                                                    </label>
                                                </div>
                                                <textarea
                                                    class="textarea textarea-bordered textarea-sm w-full leading-tight h-16"
                                                    value={item.details}
                                                    onInput$={(e) => item.details = (e.target as HTMLTextAreaElement).value}
                                                    placeholder="Descripción ampliada de cómo solucionarlo o su contexto..."
                                                />
                                            </div>
                                            <button onClick$={() => removeQuestion(sIndex, qIndex)} class="btn btn-square btn-sm btn-ghost text-red-400 hover:bg-red-900/30">
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick$={() => addQuestion(sIndex)} class="btn btn-sm btn-outline border-dashed border-gray-600 text-gray-300 w-full mt-2">
                                        + Agregar Nueva Tarea a {section.title}
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button onClick$={addSection} class="btn btn-outline border-dashed border-cyan-700 text-cyan-500 w-full p-8 h-auto font-bold text-lg hover:bg-cyan-900/20 hover:border-cyan-500">
                            + Crear Nueva Categoría Principal
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export const head: DocumentHead = {
    title: 'Gestor de Preguntas — CyberMetrik',
};
