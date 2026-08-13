import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger.config.js';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

let adapter: any;

if (dbUrl.startsWith('file:')) {
  const dbPath = dbUrl.replace('file:', '');
  adapter = new PrismaBetterSqlite3({ url: dbPath });
} else {
  const pool = new pg.Pool({ connectionString: dbUrl });
  adapter = new PrismaPg(pool);
}

export const prisma = new PrismaClient({ adapter });

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info(`✅ Database connected successfully via Prisma (${dbUrl.startsWith('file:') ? 'SQLite' : 'PostgreSQL'})`);
  } catch (error) {
    logger.warn('⚠️ Database connection issue. Check your connection string or database server status.');
    logger.error('Database Connection Error:', error);
  }
};
