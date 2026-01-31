import { NextRequest, NextResponse } from "next/server"
import { signOut } from "next-auth/react"

export async function POST(req: NextRequest) {
  try {
    // NextAuth handles signout via its own endpoint
    // This is a convenience endpoint for client-side calls
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 })
  }
}






