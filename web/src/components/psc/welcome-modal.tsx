import { component$, useSignal, $, type PropFunction } from '@builder.io/qwik';
import Icon from '~/components/core/icon';

interface WelcomeModalProps {
    isOpen: boolean;
    onSubmit: PropFunction<(name: string) => void>;
}

export default component$<WelcomeModalProps>((props) => {
    const userName = useSignal('');
    const error = useSignal('');

    const handleSubmit = $(async () => {
        const trimmedName = userName.value.trim();
        if (!trimmedName) {
            error.value = 'Por favor, ingresa tu nombre';
            return;
        }
        if (trimmedName.length < 2) {
            error.value = 'El nombre debe tener al menos 2 caracteres';
            return;
        }
        await props.onSubmit(trimmedName);
    });

    if (!props.isOpen) return null;

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop with blur */}
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

            {/* Modal Card */}
            <div class="relative w-full max-w-md transform transition-all animate-slideUp">
                <div class="
                    bg-gradient-to-br from-gray-800/95 to-gray-900/95
                    rounded-2xl shadow-2xl border border-gray-700/50
                    backdrop-filter backdrop-blur-xl
                    p-8
                ">
                    {/* Icon Header */}
                    <div class="flex justify-center mb-6">
                        <div class="
                            w-20 h-20 rounded-full
                            bg-gradient-to-br from-cyan-500 to-purple-600
                            flex items-center justify-center
                            shadow-lg shadow-cyan-500/30
                            animate-pulse
                        ">
                            <Icon icon="person" width={40} height={40} class="text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 class="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        ¡Bienvenido a CyberMetrik!
                    </h2>

                    {/* Subtitle */}
                    <p class="text-center text-gray-300 mb-8">
                        Para comenzar tu análisis de seguridad personal, por favor ingresa tu nombre
                    </p>

                    {/* Input Field */}
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={userName.value}
                            onInput$={(e) => {
                                userName.value = (e.target as HTMLInputElement).value;
                                error.value = '';
                            }}
                            onKeyPress$={(e) => {
                                if (e.key === 'Enter') {
                                    handleSubmit();
                                }
                            }}
                            placeholder="Ej: Juan Pérez"
                            class="
                                w-full px-4 py-3 rounded-lg
                                bg-gray-700/50 border border-gray-600
                                text-white placeholder-gray-400
                                focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                                transition-all duration-200
                            "
                            autoFocus
                        />
                        {error.value && (
                            <p class="mt-2 text-sm text-red-400 flex items-center gap-1">
                                <Icon icon="warning" width={16} height={16} />
                                {error.value}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick$={handleSubmit}
                        class="
                            w-full py-3 px-6 rounded-lg
                            bg-gradient-to-r from-cyan-500 to-purple-600
                            hover:from-cyan-600 hover:to-purple-700
                            text-white font-semibold
                            shadow-lg shadow-cyan-500/30
                            transform hover:scale-[1.02] active:scale-[0.98]
                            transition-all duration-200
                            flex items-center justify-center gap-2
                        "
                    >
                        <Icon icon="check" width={20} height={20} />
                        Comenzar Análisis
                    </button>

                    {/* Footer Note */}
                    <p class="mt-6 text-xs text-center text-gray-400">
                        Tu nombre se utilizará para personalizar tus reportes de seguridad
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.4s ease-out;
                }
            `}</style>
        </div>
    );
});
