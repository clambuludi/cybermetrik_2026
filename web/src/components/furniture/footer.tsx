import { component$ } from "@builder.io/qwik";

export default component$(() => {

  const licenseLink = 'https://github.com/Lissy93/personal-security-checklist/blob/master/LICENSE';

  return (
    <footer class="footer footer-center px-4 py-2 mt-4 text-base-content bg-base-200 bg-opacity-25">
      <aside>
        <p>Licensed under <a href={licenseLink} class="link link-primary">MIT</a> -
          © <span class="font-bold">CyberMetrik</span> {new Date().getFullYear()}</p>
      </aside>
    </footer>
  );
});
