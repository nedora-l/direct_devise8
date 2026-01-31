import { NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const url = process.env.BKAM_TREASURY_URL
    if (!url) return NextResponse.json({ error: "not_configured" }, { status: 501 })
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    const json = await res.json().catch(() => null)
    return NextResponse.json({ data: json })
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
