import { globalAction$, z, zod$ } from '@builder.io/qwik-city';
import { db } from '~/db';
import { users, reports } from '~/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyPassword, createToken, type SessionPayload } from '~/utils/auth';

export const useLogin = globalAction$(
    async (data, { cookie }) => {
        console.log(`[LOGIN] Attempt for: ${data.email}`);
        const [user] = await db.select()
            .from(users)
            .where(eq(users.email, data.email.toLowerCase()))
            .limit(1);

        if (!user) {
            console.log(`[LOGIN] User not found: ${data.email}`);
            return { success: false, error: 'Credenciales inválidas' };
        }

        console.log(`[LOGIN] User found, verifying password...`);
        const valid = await verifyPassword(data.password, user.passwordHash);
        if (!valid) {
            console.log(`[LOGIN] Invalid password for: ${data.email}`);
            return { success: false, error: 'Credenciales inválidas' };
        }



        console.log(`[LOGIN] Success for: ${data.email} (${user.role})`);
        const payload: SessionPayload = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role as 'admin' | 'client',
        };

        const token = createToken(payload);
        cookie.set('cm_session', token, {
            httpOnly: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return { success: true, user: payload };
    },
    zod$({
        email: z.string().email('Email no válido'),
        password: z.string().min(1, 'Ingresa tu contraseña'),
    })
);
