import { config as loadEnv } from 'dotenv';
import path from 'path';
import { defineConfig } from 'prisma/config';

loadEnv({ path: path.join(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  },
});
