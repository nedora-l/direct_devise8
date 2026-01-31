import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const body = await req.json()
    const auctions: any[] = body.auctions || []

    for (const a of auctions) {
      let company = await prisma.company.findFirst({ where: { name: a.company } })
      if (!company) {
        company = await prisma.company.create({ data: { name: a.company } })
      }

      const auction = await prisma.auction.upsert({
        where: { id: a.id },
        update: {
          companyId: company.id,
          title: a.title,
          amount: Number(a.amount) || 0,
          sourceCurrency: a.sourceCurrency,
          targetCurrency: a.targetCurrency,
          description: a.description || null,
          duration: parseInt(a.duration) || 0,
          status: a.status || "active",
          createdBy: a.createdBy || "system",
          endsAt: new Date(a.endsAt),
          swiftReference: a.swiftReference || null,
        },
        create: {
          id: a.id,
          companyId: company.id,
          title: a.title,
          amount: Number(a.amount) || 0,
          sourceCurrency: a.sourceCurrency,
          targetCurrency: a.targetCurrency,
          description: a.description || null,
          duration: parseInt(a.duration) || 0,
          status: a.status || "active",
          createdBy: a.createdBy || "system",
          createdAt: new Date(a.createdAt),
          endsAt: new Date(a.endsAt),
          swiftReference: a.swiftReference || null,
        },
      })

      const bids: any[] = a.bids || []
      for (const b of bids) {
        await prisma.bid.upsert({
          where: { id: b.id },
          update: {
            auctionId: auction.id,
            bankId: b.bankId,
            bankName: b.bankName,
            rate: Number(b.rate) || 0,
            charges: Number(b.charges) || 0,
            terms: b.terms || null,
            timestamp: new Date(b.timestamp),
          },
          create: {
            id: b.id,
            auctionId: auction.id,
            bankId: b.bankId,
            bankName: b.bankName,
            rate: Number(b.rate) || 0,
            charges: Number(b.charges) || 0,
            terms: b.terms || null,
            timestamp: new Date(b.timestamp),
          },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}