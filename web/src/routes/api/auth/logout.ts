import { globalAction$ } from '@builder.io/qwik-city';

export const useLogout = globalAction$(async (_, { cookie, redirect }) => {
    cookie.delete('cm_session', { path: '/' });
    throw redirect(302, '/');
});
