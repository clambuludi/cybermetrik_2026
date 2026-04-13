import { $, component$, useSignal } from '@builder.io/qwik';
import { useLogin } from '~/routes/api/auth/login';
import { useRegister } from '~/routes/api/auth/register';

export default component$(() => {
    const tab = useSignal<'login' | 'register'>('login');
    const loginAction = useLogin();
    const registerAction = useRegister();

    const name = useSignal('');
    const email = useSignal('');
    const password = useSignal('');
    const loading = useSignal(false);

    const handleLogin = $(async () => {
        console.log('[AUTH] Handling login for:', email.value);
        loading.value = true;
        
        // Get local progress to migrate/merge
        const localProgress = localStorage.getItem('PSC_PROGRESS');
        const progress = localProgress ? JSON.parse(localProgress) : {};
        
        const result = await loginAction.submit({ 
            email: email.value, 
            password: password.value,
            progress 
        });
        
        console.log('[AUTH] Login result:', result);
        loading.value = false;
        if (result.value?.success) {
            console.log('[AUTH] Login success, reloading...');
            window.location.reload();
        }
    });

    const handleRegister = $(async () => {
        loading.value = true;
        
        // Get local progress to migrate
        const localProgress = localStorage.getItem('PSC_PROGRESS');
        const progress = localProgress ? JSON.parse(localProgress) : {};
        
        const result = await registerAction.submit({ 
            name: name.value, 
            email: email.value, 
            password: password.value,
            progress
        });
        
        loading.value = false;
        if (result.value?.success) {
            localStorage.removeItem('PSC_PROGRESS');
            localStorage.removeItem('PSC_IGNORED');
            localStorage.removeItem('PSC_USER_NAME');
            window.location.reload();
        }
    });

    const loginError = loginAction.value?.error;
    const registerError = registerAction.value?.error;

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div class="relative w-full max-w-md">
                <div class="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-xl p-8">

                    {/* Icon */}
                    <div class="flex justify-center mb-6">
                        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.73 9 12 5.16-1.27 9-6.45 9-12V5l-9-4z" />
                            </svg>
                        </div>
                    </div>

                    <h2 class="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        CyberMetrik
                    </h2>
                    <p class="text-center text-gray-400 text-sm mb-6">Plataforma de análisis de madurez en ciberseguridad</p>

                    {/* Tabs */}
                    <div class="flex gap-2 mb-6 bg-gray-800/60 rounded-xl p-1">
                        <button
                            class={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab.value === 'login' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                            onClick$={() => tab.value = 'login'}
                        >
                            Ingresar
                        </button>
                        <button
                            class={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab.value === 'register' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                            onClick$={() => tab.value = 'register'}
                        >
                            Registrarse
                        </button>
                    </div>

                    {/* Form */}
                    <div class="flex flex-col gap-4">
                        {tab.value === 'register' && (
                            <input
                                type="text"
                                placeholder="Nombre completo"
                                value={name.value}
                                onInput$={(e) => name.value = (e.target as HTMLInputElement).value}
                                class="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={email.value}
                            onInput$={(e) => email.value = (e.target as HTMLInputElement).value}
                            class="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                        />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password.value}
                            onInput$={(e) => password.value = (e.target as HTMLInputElement).value}
                            onKeyPress$={(e) => {
                                if (e.key === 'Enter') {
                                    tab.value === 'login' ? handleLogin() : handleRegister();
                                }
                            }}
                            class="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                        />

                        {/* Error */}
                        {(loginError || registerError) && (
                            <p class="text-sm text-red-400 flex items-center gap-1 bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                                {loginError || registerError}
                            </p>
                        )}

                        <button
                            onClick$={tab.value === 'login' ? handleLogin : handleRegister}
                            disabled={loading.value}
                            class="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-cyan-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading.value ? (
                                <span class="loading loading-spinner loading-sm" />
                            ) : (
                                tab.value === 'login' ? 'Ingresar' : 'Crear cuenta'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
