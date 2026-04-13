import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.AUTH_SECRET || 'cybermetrik-secret-change-in-production-2024';
const COOKIE_NAME = 'cm_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export interface SessionPayload {
    userId: number;
    email: string;
    name: string;
    role: 'admin' | 'client';
}

export function createToken(payload: SessionPayload): string {
    return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): SessionPayload | null {
    try {
        return jwt.verify(token, SECRET) as SessionPayload;
    } catch {
        return null;
    }
}

export function getCookieHeader(token: string): string {
    return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

export function getClearCookieHeader(): string {
    return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export { COOKIE_NAME };
