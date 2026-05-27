declare module 'better-sqlite3';

declare module 'drizzle-kit' {
    export interface Config {
        schema?: string;
        out?: string;
        driver?: string;
        dbCredentials?: {
            url: string;
        };
    }
}
