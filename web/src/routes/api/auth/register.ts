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

        // Create initial report if progress was provided
        if (data.progress && Object.keys(data.progress).length > 0) {
            try {
                // Calculate some stats for the report
                const completedCount = Object.values(data.progress).filter(Boolean).length;
                // We'll use a default totalCount if not provided, or let the admin panel handle it
                await db.insert(reports).values({
                    userId: newUser.id,
                    userName: newUser.name,
                    score: 0, // Admin panel calculates this, or we can calculate here
                    completedCount: completedCount,
                    totalCount: 259, // Default for PSC
                    data: JSON.stringify(data.progress),
                });
            } catch (e) {
                console.error('[AUTH] Failed to migrate initial progress:', e);
            }
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
        progress: z.record(z.boolean()).optional(),
    })
);
