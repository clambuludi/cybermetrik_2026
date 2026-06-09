import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Resolve reports.db path dynamically (handling both local Windows development and Linux production)
let dbPath = path.resolve(process.cwd(), 'reports.db');

if (!fs.existsSync(dbPath)) {
  const webPath = path.resolve(process.cwd(), 'web/reports.db');
  if (fs.existsSync(webPath)) {
    dbPath = webPath;
  } else if (process.platform !== 'win32') {
    const prodPath = '/var/www/cybermetrik/web/reports.db';
    dbPath = prodPath;
  }
}

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);

