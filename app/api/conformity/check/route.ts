import { NextRequest, NextResponse } from "next/server"
import { runConformityChecks } from "@/lib/conformity-checker"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const checks = runConformityChecks(body)

    return NextResponse.json({ checks })
  } catch (error) {
    return NextResponse.json({ error: "Failed to run conformity checks" }, { status: 500 })
  }
}
