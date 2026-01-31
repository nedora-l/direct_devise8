import { NextRequest, NextResponse } from "next/server"
import { kycManager } from "@/lib/kyc-manager"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { kycId, adminId, action, notes } = body

    if (!kycId || !adminId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let profile
    if (action === "approve") {
      profile = kycManager.verifyProfile(kycId, adminId, notes)
    } else if (action === "reject") {
      profile = kycManager.rejectProfile(kycId, adminId, notes || "")
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to verify profile"
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
