import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { auctionId, bankId, bankName, rate, charges, terms } = body

    if (!auctionId || !bankId || !bankName || rate === undefined || charges === undefined) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
    }

    const prisma = getPrisma()

    const auction = await prisma.auction.findUnique({ where: { id: auctionId } })
    if (!auction) {
      return NextResponse.json({ error: "Enchère introuvable" }, { status: 404 })
    }

    if (auction.status !== "active") {
      return NextResponse.json({ error: "Enchère non ouverte" }, { status: 400 })
    }

    if (auction.endsAt && new Date(auction.endsAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Enchère terminée" }, { status: 400 })
    }

    const numericRate = Number(rate)
    const numericCharges = Number(charges)
    if (!isFinite(numericRate) || !isFinite(numericCharges)) {
      return NextResponse.json({ error: "Valeurs numériques invalides" }, { status: 400 })
    }

    const existing = await prisma.bid.findFirst({ where: { auctionId, bankId } })
    let bid
    if (existing) {
      bid = await prisma.bid.update({
        where: { id: existing.id },
        data: {
          bankName,
          rate: numericRate,
          charges: numericCharges,
          terms: terms || null,
          timestamp: new Date(),
        },
      })
    } else {
      bid = await prisma.bid.create({
        data: {
          auctionId,
          bankId,
          bankName,
          rate: numericRate,
          charges: numericCharges,
          terms: terms || null,
        },
      })
    }

    if (!bid) {
      return NextResponse.json({ error: "Échec de soumission" }, { status: 400 })
    }

    return NextResponse.json({ bid }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur lors de la soumission" }, { status: 500 })
  }
}
