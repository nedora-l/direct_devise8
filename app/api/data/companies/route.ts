import { NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function GET() {
  try {
    const prisma = getPrisma()
    const companies = await prisma.company.findMany()
    return NextResponse.json({ companies })
  } catch {
    return NextResponse.json({ companies: [] }, { status: 200 })
  }
}