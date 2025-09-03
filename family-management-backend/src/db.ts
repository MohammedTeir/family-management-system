import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg; 
// ✅ Use TCP PostgreSQL driver
import { drizzle } from 'drizzle-orm/node-postgres'; // ✅ Drizzle adapter for pg
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?',
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // ✅ Required for Neon over TCP
  },
});

export const db = drizzle(pool, { schema });