import { component$ } from "@builder.io/qwik";



export default component$(() => {
  return (
    <div class="hero mb-8 mx-auto xl:max-w-7xl max-w-6xl w-full xl:px-10">
      <div class="hero-content text-center bg-front shadow-sm lg:rounded-xl w-full">
        <div class="max-w-2xl flex flex-col place-items-center">
          <h1 class="text-5xl font-bold">Checklist de Seguridad Personal</h1>
          <p class="subtitle pb-6">Tu guía para asegurar tu vida digital y proteger tu privacidad</p>
          <div class="mb-8 rounded-[2rem] p-1 bg-gradient-to-r from-cyan-500 to-purple-600 shadow-2xl shadow-cyan-500/20 hover:scale-105 transition-transform duration-300">
            <img src="/cnt-logo.png" alt="CNT Logo" class="w-32 h-32 object-cover rounded-[1.8rem]" />
          </div>
        </div>
      </div>
    </div>
  );
});
