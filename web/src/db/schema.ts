import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('client'), // 'admin' | 'client'
});

export const reports = sqliteTable('reports', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    userId: integer('user_id').references(() => users.id),
    userName: text('user_name').notNull(),
    score: integer('score').notNull(),
    completedCount: integer('completed_count').notNull(),
    totalCount: integer('total_count').notNull(),
    data: text('data').notNull(), // JSON string with the checkedItems state
    isFinalized: integer('is_finalized').notNull().default(0), // 0: Draft, 1: Finalized
    evaluationNumber: integer('evaluation_number').notNull().default(1),
});

export const appConfig = sqliteTable('app_config', {
    key: text('key').primaryKey(),
    value: text('value').notNull(), // JSON string 
});
