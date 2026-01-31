import { NextRequest, NextResponse } from "next/server"
import { audit } from "@/lib/audit-logger"

export async function GET(req: NextRequest) {
  try {
    const startDate = req.nextUrl.searchParams.get("startDate")
    const endDate = req.nextUrl.searchParams.get("endDate")

    const summary = audit.getSummary(startDate || undefined, endDate || undefined)

    return NextResponse.json({ summary })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get summary" }, { status: 500 })
  }
}
