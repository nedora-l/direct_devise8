import { NextRequest, NextResponse } from "next/server"
import { audit } from "@/lib/audit-logger"

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")
    const action = req.nextUrl.searchParams.get("action")
    const entity = req.nextUrl.searchParams.get("entity")
    const status = req.nextUrl.searchParams.get("status")
    const startDate = req.nextUrl.searchParams.get("startDate")
    const endDate = req.nextUrl.searchParams.get("endDate")

    const logs = audit.getLogs({
      userId: userId || undefined,
      action: action as any || undefined,
      entity: entity || undefined,
      status: status as any || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })

    return NextResponse.json({ logs, total: logs.length })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const format = body.format || "json"

    const exported = audit.export(format as "json" | "csv")

    return NextResponse.json({
      data: exported,
      format,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to export audit logs" }, { status: 500 })
  }
}
