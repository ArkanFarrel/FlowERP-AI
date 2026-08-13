import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString(): string {
  let connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:51214/postgres?sslmode=disable';
  if (connectionString.startsWith('prisma+postgres://')) {
    try {
      const urlObj = new URL(connectionString);
      const apiKey = urlObj.searchParams.get('api_key');
      if (apiKey) {
        const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8'));
        if (decoded.databaseUrl) {
          connectionString = decoded.databaseUrl;
        }
      }
    } catch {
      // ignore
    }
  }
  return connectionString.replace('/template1', '/postgres');
}

function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionString();
  const pool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 2000,
    max: 10,
  });

  pool.on('error', (err) => {
    console.warn('PrismaPg pool reset:', err instanceof Error ? err.message : String(err));
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

