import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const companyName = req.nextUrl.searchParams.get("company") || ""
    const bankName = req.nextUrl.searchParams.get("bank") || ""
    const prisma = getPrisma()
    const company = await prisma.company.findFirst({ where: { name: companyName } })
    if (!company) return NextResponse.json({ auctions: [] })
    const auctionsRaw = await prisma.auction.findMany({ where: { companyId: company.id }, include: { bids: true } })
    const auctions = bankName
      ? auctionsRaw.map(a => ({
          ...a,
          bids: a.bids.filter(b => b.bankName === bankName),
        }))
      : auctionsRaw
    return NextResponse.json({ auctions })
  } catch {
    return NextResponse.json({ auctions: [] }, { status: 200 })
  }
}