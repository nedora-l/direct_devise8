import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Dummy URL for prisma generate when DATABASE_URL is missing (e.g. Vercel build); runtime uses real DATABASE_URL from env
const url = process.env.DATABASE_URL || 'postgresql://build:build@localhost:5432/build'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url,
  },
})