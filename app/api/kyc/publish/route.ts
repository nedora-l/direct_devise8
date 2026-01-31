import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("[v0] API /kyc/publish - received", body)
    
    // Mock: return success with reviewing status
    return NextResponse.json({
      success: true,
      status: "reviewing",
      message: "KYC submitted for review"
    })
  } catch (error) {
    console.error("[v0] API /kyc/publish - error", error)
    return NextResponse.json(
      { success: false, error: "Failed to publish KYC" },
      { status: 500 }
    )
  }
}
