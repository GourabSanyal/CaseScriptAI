import pg from 'pg';
import { requireDatabaseUrl } from './env.js';

const { Pool } = pg;

export type DbPool = pg.Pool;
export type DbClient = pg.PoolClient;

export const createPool = (databaseUrl = requireDatabaseUrl()): DbPool =>
  new Pool({
    connectionString: databaseUrl,
    // Render external Postgres often needs SSL
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
      ? undefined
      : { rejectUnauthorized: false },
  });
