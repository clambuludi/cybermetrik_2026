
import { $, component$, useContext } from "@builder.io/qwik";

import Icon from "~/components/core/icon";
import type { Section } from '~/types/PSC';
import { useTheme } from '~/store/theme-store';
import articles from '~/data/articles';
import { ChecklistContext } from '~/store/checklist-context';
import { UserContext } from '~/store/user-context';
import { useLogout } from '~/routes/api/auth/logout';
import { ProgressContext } from '~/store/progress-context';
import { useNavigate, useLocation } from '@builder.io/qwik-city';


export default component$(() => {
  const data = useContext(ChecklistContext);
  const { user: currentUser } = useContext(UserContext);
  const { theme, setTheme } = useTheme();
  const logoutAction = useLogout();
  const progress = useContext(ProgressContext);
  const nav = useNavigate();
  const loc = useLocation();
  const isHome = loc.url.pathname === '/';

  const handleHomeNavigation = $((e: Event, path: string) => {
    e.preventDefault();
    if (progress?.ignored) {
        const ignoredKeys = Object.keys(progress.ignored).filter(k => progress.ignored[k]);
        const missingJustification = ignoredKeys.find(k => !progress.justifications || !progress.justifications[k] || progress.justifications[k].trim() === '');
        if (missingJustification) {
            alert('Debe llenar la justificación para todos los controles marcados como "NO APLICA" antes de regresar al inicio.');
            return;
        }
    }
    nav(path);
  });

  const themes = [
    'dark', 'light', 'night', 'cupcake',
    'bumblebee', 'corporate', 'synthwave', 'retro',
    'valentine', 'halloween', 'aqua', 'lofi',
    'fantasy', 'dracula'
  ];

  const deleteAllData = $(() => {
    const isConfirmed = confirm('Are you sure you want to delete all local data? This will erase your progress.');
    if (isConfirmed) {
      localStorage.clear();
      location.reload();
    }
  });

  return (
    <>
      <input id="my-drawer-3" type="checkbox" class="drawer-toggle" />
      <div class="navbar bg-base-100">
        <div class="flex-1">
          <div class="flex-none md:hidden">
            <label for="my-drawer-3" aria-label="open sidebar" class="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </label>
          </div>
          <a href="/" preventdefault:click onClick$={(e) => handleHomeNavigation(e, '/')} class="btn btn-ghost h-auto py-3 px-4 flex items-center capitalize group hover:bg-base-200">
            <div class="flex items-center gap-3">
                <div class="relative flex items-center justify-center w-12 h-12">
                    {!isHome && (
                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-3 group-hover:translate-x-0">
                            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </div>
                    )}
                    <div class={`transition-all duration-300 ${!isHome ? 'group-hover:opacity-0 group-hover:scale-50' : ''}`}>
                        <Icon class="text-primary" icon="shield" width={38} height={38} />
                    </div>
                </div>
                <div class="flex flex-col items-start leading-none text-left">
                    <h1 class="text-2xl font-black tracking-wide">Digital Defense</h1>
                    {!isHome && (
                        <span class="text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 text-primary font-bold -translate-y-2 group-hover:translate-y-0 h-0 group-hover:h-[16px] overflow-hidden uppercase tracking-widest mt-1">
                            Regresar al Inicio
                        </span>
                    )}
                </div>
            </div>
          </a>
        </div>
        <div class="flex-none hidden md:flex">
          <ul class="menu menu-horizontal px-1">
            <li>
              <details>
                <summary>
                  <Icon icon="checklist" width={16} height={16} />
                  Checklists
                </summary>
                <ul class="p-2 bg-base-100 rounded-t-none z-10">
                  {data.value.map((item: Section, index: number) => (
                    <li key={`checklist-nav-${index}`} class={`hover:bg-${item.color}-600 hover:bg-opacity-15`}>
                      <a href={`/checklist/${item.slug}`}>
                        <Icon color={item.color} class="mr-2" icon={item.icon} width={16} height={16} />
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          </ul>
          <div class="tooltip tooltip-bottom" data-tip="Theme">
            <label class="cursor-pointer grid place-items-center">
              <input
                type="checkbox"
                checked={theme.theme === 'dark'}
                onClick$={() => {
                  setTheme(theme.theme === 'dark' ? 'light' : 'dark');
                }}
                class="toggle theme-controller bg-base-content row-start-1 col-start-1 col-span-2"
              />
              <svg class="col-start-1 row-start-1 stroke-base-100 fill-base-100" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
              <svg class="col-start-2 row-start-1 stroke-base-100 fill-base-100" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </label>
          </div>
          <li class="list-none px-2">
            <p
              onClick$={() => ((document.getElementById('settings_modal') || {}) as HTMLDialogElement).showModal()}
              class="cursor-pointer tooltip flex tooltip-bottom" data-tip="Settings">
              <Icon icon="settings" width={20} height={20} />
            </p>
          </li>
          {/* User info + logout */}
          <div class="flex items-center gap-2 ml-2">
            {currentUser && (
              <>
                {currentUser.role === 'admin' && (
                  <a href="/admin" class="btn btn-ghost btn-sm text-warning gap-1">
                    <Icon icon="settings" width={14} height={14} />
                    Admin
                  </a>
                )}
                <div class="flex items-center gap-2 bg-base-200 rounded-full px-3 py-1">
                  <div class="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span class="text-sm font-medium hidden lg:block">{currentUser.name}</span>
                </div>
                <button
                  onClick$={$(() => {
                    localStorage.removeItem('PSC_PROGRESS');
                    localStorage.removeItem('PSC_PARTIAL_DECIMAL');
                    localStorage.removeItem('PSC_IGNORED');
                    localStorage.removeItem('PSC_EVIDENCE');
                    localStorage.removeItem('PSC_JUSTIFICATIONS');
                    localStorage.removeItem('PSC_USER_NAME');
                    localStorage.removeItem('PSC_WELCOME_DISMISSED');
                    sessionStorage.removeItem('PSC_SYNCED_USER');
                    logoutAction.submit({});
                  })}
                  class="btn btn-ghost btn-sm btn-square tooltip tooltip-bottom"
                  data-tip="Cerrar sesión"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="opacity-70"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div class="drawer-side z-10">
        <label for="my-drawer-3" aria-label="close sidebar" class="drawer-overlay"></label>
        <ul class="rounded-box menu p-4 w-80 min-h-full bg-base-200">
          <h2 class="flex text-primary">
            <Icon class="mr-2" icon="shield" width={16} height={16} />
            Digital Defense
          </h2>
          <li><a href="/" preventdefault:click onClick$={(e) => handleHomeNavigation(e, '/')}><Icon class="mr-2" icon="homepage" width={16} height={16} />Home</a></li>
          <li>
            <a href="/checklist"><Icon class="mr-2" icon="all" width={16} height={16} />Checklists</a>
            <ul>
              {data.value.map((item: Section, index: number) => (
                <li key={`checklist-side-${index}`} class={`hover:bg-${item.color}-600 hover:bg-opacity-15`}>
                  <a href={`/checklist/${item.slug}`}>
                    <Icon color={item.color} class="mr-2" icon={item.icon} width={16} height={16} />
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <a href="/article">
              <Icon class="mr-2" icon="articles" width={16} height={16} />Articles
            </a>
            <ul>
              {articles.map(article => (
                <li key={article.slug}>
                  <a href={`/article/${article.slug}`}>{article.title}</a>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <a href="/about">
              <Icon class="mr-2" icon="about" width={16} height={16} />About
            </a>
            <ul>
            </ul>
            <ul>
              <li>
                <a href="/about#author">Author</a>
                <ul>
                  <li><a href="https://aliciasykes.com/contact">Contact</a></li>
                  <li>
                    <a href="https://apps.aliciasykes.com">More Apps</a>
                  </li>
                  <li class="flex flex-row">
                    <a href="https://x.com/lissy_sykes"><Icon icon="twitter" width={16} height={16} /></a>
                    <a href="https://mastodon.social/@lissy93"><Icon icon="mastodon" width={16} height={16} /></a>
                    <a href="https://dev.to/lissy93"><Icon icon="dev" width={16} height={16} /></a>
                    <a href="https://linkedin.com/in/aliciasykes"><Icon icon="linkedin" width={16} height={16} /></a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <dialog id="settings_modal" class="modal">
        <div class="modal-box">
          <div class="tabs tabs-lifted">
            <p class="tab tab-active">Settings</p>
            <a class="tab" href="/about">About</a>
          </div>
          <div class="modal-action justify-start w-full flex flex-col gap-4">
            <div class="flex items-between w-full justify-between">
              <label for="theme" class="label">Theme</label>
              <select
                id="theme"
                class="select select-bordered w-full max-w-xs"
                onChange$={(event) => setTheme((event.target as HTMLSelectElement).value)}
              >
                <option disabled selected>Theme</option>
                {themes.map((someTheme) => (
                  <option
                    key={someTheme}
                    value={someTheme}
                    selected={someTheme === theme.theme}
                  >
                    {someTheme.charAt(0).toUpperCase() + someTheme.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div class="flex items-between w-full justify-between">
              <label class="label">Data</label>
              <button class="btn btn-primary" onClick$={deleteAllData}>Delete All</button>
            </div>
            <button
              class="btn my-1 mx-auto"
              onClick$={() => ((document.getElementById('settings_modal') || {}) as HTMLDialogElement).close()}
            >Close</button>
          </div>
        </div>
      </dialog>
    </>
  );
});
