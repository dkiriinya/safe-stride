import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

export const isDatabaseConfigured = Boolean(databaseUrl && !databaseUrl.includes('sample'));

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!isDatabaseConfigured) {
    return null;
  }
  if (!dbInstance) {
    const sql = neon(databaseUrl!);
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

export const db = isDatabaseConfigured ? drizzle(neon(databaseUrl!), { schema }) : null;
