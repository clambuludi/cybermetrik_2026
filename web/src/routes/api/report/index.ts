import { globalAction$, z, zod$ } from '@builder.io/qwik-city';
import { db } from '~/db';
import { reports } from '~/db/schema';
import { COOKIE_NAME, verifyToken } from '~/utils/auth';
import { eq, and, desc } from 'drizzle-orm';

export const useSaveReport = globalAction$(
  async (data, { cookie }) => {
    let userId: number | null = null;
    const token = cookie.get(COOKIE_NAME)?.value;
    if (token) {
        const session = verifyToken(token);
        if (session) userId = session.userId;
    }

    const { userName, score, completedCount, totalCount, checkedItems, progresoParcialDecimal, ignoredItems, evidenceLinks, justifications, finalize, isoScore, egsiScore, clausesScore } = data;

    // 1. Look for existing draft
    let draft = null;
    if (userId) {
        const existingDrafts = await db.select()
            .from(reports)
            .where(and(eq(reports.userId, userId), eq(reports.isFinalized, 0)))
            .limit(1);
        if (existingDrafts.length > 0) draft = existingDrafts[0];
    } else if (userName) {
        // For guests, try to find a draft by name to avoid duplicates during the same session
        const existingDrafts = await db.select()
            .from(reports)
            .where(and(eq(reports.userName, userName), eq(reports.isFinalized, 0)))
            .limit(1);
        if (existingDrafts.length > 0) draft = existingDrafts[0];
    }

    let result;
    if (draft) {
        // Update existing draft
        result = await db.update(reports)
            .set({
                score,
                completedCount,
                totalCount,
                data: JSON.stringify({ checkedItems, progresoParcialDecimal, ignoredItems, evidenceLinks, justifications, isoScore, egsiScore, clausesScore, ...checkedItems }),
                progresoParcialDecimal: JSON.stringify(progresoParcialDecimal || {}),
                isFinalized: finalize ? 1 : 0,
                createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) // Update timestamp
            })
            .where(eq(reports.id, draft.id))
            .returning();
    } else {
        // Get next evaluation number
        let nextEvalNum = 1;
        const lastReports = await db.select({ num: reports.evaluationNumber })
            .from(reports)
            .where(userId ? eq(reports.userId, userId) : eq(reports.userName, userName))
            .orderBy(desc(reports.evaluationNumber))
            .limit(1);
        if (lastReports.length > 0) {
            nextEvalNum = (lastReports[0].num || 0) + 1;
        }

        // Insert new report
        result = await db.insert(reports).values({
            userId,
            userName,
            score,
            completedCount,
            totalCount,
            isFinalized: finalize ? 1 : 0,
            evaluationNumber: nextEvalNum,
            data: JSON.stringify({ checkedItems, progresoParcialDecimal, ignoredItems, evidenceLinks, justifications, isoScore, egsiScore, clausesScore, ...checkedItems }),
            progresoParcialDecimal: JSON.stringify(progresoParcialDecimal || {}),
        }).returning();
    }
    
    return { success: true, report: result[0] };
  },
  zod$({
    userName: z.string().min(1, 'El nombre es requerido'),
    score: z.number(),
    completedCount: z.number(),
    totalCount: z.number(),
    checkedItems: z.record(z.union([z.boolean(), z.number()])),
    progresoParcialDecimal: z.record(z.number()).optional(),
    ignoredItems: z.record(z.union([z.boolean(), z.number()])).optional(),
    evidenceLinks: z.record(z.string()).optional(),
    justifications: z.record(z.string()).optional(),
    finalize: z.boolean().optional().default(false),
    isoScore: z.number().optional(),
    egsiScore: z.number().optional(),
    clausesScore: z.number().optional(),
  })
);

export const useClearHistory = globalAction$(
    async (_, { cookie }) => {
        const token = cookie.get(COOKIE_NAME)?.value;
        if (!token) return { success: false, error: 'No autenticado' };
        const session = verifyToken(token);
        if (!session) return { success: false, error: 'Sesión inválida' };

        try {
            await db.delete(reports).where(eq(reports.userId, session.userId));
            return { success: true };
        } catch (e) {
            console.error('Error clearing history:', e);
            return { success: false, error: 'Error al limpiar el historial' };
        }
    }
);

export const useAdminResetHistory = globalAction$(
    async ({ clientId }, { cookie }) => {
        const token = cookie.get(COOKIE_NAME)?.value;
        if (!token) return { success: false, error: 'No autenticado' };
        const session = verifyToken(token);
        if (!session || session.role !== 'admin') return { success: false, error: 'No autorizado' };

        try {
            await db.delete(reports).where(eq(reports.userId, clientId));
            return { success: true };
        } catch (e) {
            console.error('Error in admin reset history:', e);
            return { success: false, error: 'Error al reiniciar el historial del cliente' };
        }
    },
    zod$({ clientId: z.number() })
);

