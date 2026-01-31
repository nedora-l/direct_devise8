import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const prisma = getPrisma()
    const resolvedParams = await Promise.resolve(params)
    const auction = await prisma.auction.findUnique({
      where: { id: resolvedParams.id },
      include: { 
        company: { 
          include: { 
            kyc: true,
            swifts: {
              where: { validated: true },
            }
          }
        }, 
        bids: true 
      },
    })

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    return NextResponse.json({ auction })
  } catch (error) {
    console.error("[api/auctions/[id]] Error:", error)
    return NextResponse.json({ error: "Failed to fetch auction" }, { status: 500 })
  }
}
