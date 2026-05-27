import { globalAction$, z, zod$ } from '@builder.io/qwik-city';
import { db } from '~/db';
import { users, reports } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, createToken, type SessionPayload } from '~/utils/auth';

export const useRegister = globalAction$(
    async (data, { cookie }) => {
        // Check if email already exists
        const existing = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.email, data.email.toLowerCase()))
            .limit(1);

        if (existing.length > 0) {
            return { success: false, error: 'Este email ya está registrado' };
        }

        const passwordHash = await hashPassword(data.password);
        const [newUser] = await db.insert(users).values({
            name: data.name,
            email: data.email.toLowerCase(),
            passwordHash,
            role: 'client',
        }).returning();

        if (!newUser) {
            return { success: false, error: 'Error al crear el usuario' };
        }

        const payload: SessionPayload = {
            userId: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role as 'admin' | 'client',
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
        name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
        email: z.string().email('Email no válido'),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    })
);
