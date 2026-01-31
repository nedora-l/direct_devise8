import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("[v0] API /kyc/documents - received", body)
    
    // Mock: just return success
    return NextResponse.json({
      success: true,
      message: "Documents saved"
    })
  } catch (error) {
    console.error("[v0] API /kyc/documents - error", error)
    return NextResponse.json(
      { success: false, error: "Failed to save documents" },
      { status: 500 }
    )
  }
}
