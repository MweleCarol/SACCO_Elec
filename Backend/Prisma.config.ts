import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Prisma 7 deprecates package.json's "prisma": { "seed": ... } block
    // entirely — the seed command belongs here now. -r tsconfig-paths/register
    // isn't strictly required today (seed.ts currently only uses relative
    // imports), but costs nothing to include and avoids a silent breakage
    // the moment a @shared/... import gets added to the seed script later.
    seed: 'ts-node -r tsconfig-paths/register prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});