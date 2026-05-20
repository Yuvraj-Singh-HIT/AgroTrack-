import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../backend/prisma/dev.db');

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

try {
  const count = await prisma.user.count();
  console.log('OK: SQLite database reachable at', dbPath);
  console.log('User table row count:', count);
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
