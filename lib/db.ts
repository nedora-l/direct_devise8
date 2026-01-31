import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

let prismaInstance: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const url = process.env.DATABASE_URL as string | undefined
    // Only use PostgreSQL adapter if the URL is actually for PostgreSQL
    const isPostgres = url?.startsWith("postgres://") || url?.startsWith("postgresql://")
    const adapter = isPostgres && url ? new PrismaPg({ connectionString: url }) : undefined
    prismaInstance = adapter
      ? new PrismaClient({ log: ["error"], adapter })
      : new PrismaClient({ log: ["error"] })
  }
  return prismaInstance
}