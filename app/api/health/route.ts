import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  let db = "unknown"
  const envUrl = process.env.DATABASE_URL ? true : false
  try {
    const prisma = getPrisma()
    await prisma.$connect()
    db = "ok"
  } catch {
    db = "error"
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "DIRECT DEVISE",
    db,
    envUrl,
  })
}
