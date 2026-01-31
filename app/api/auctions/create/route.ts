import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company, title, amount, sourceCurrency, targetCurrency, description, duration, createdBy, swiftReference, conversionMode } = body

    if (!company || !title || (!swiftReference && !amount) || !sourceCurrency || !targetCurrency || !createdBy || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

  const prisma = getPrisma()
  const companyRow = await prisma.company.findFirst({ where: { name: company } })
  if (!companyRow) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    let computedAmount: number | null = null
    if (swiftReference) {
      const swift = await prisma.swift.findFirst({ where: { reference: swiftReference } })
      if (!swift) {
        return NextResponse.json({ error: "SWIFT introuvable" }, { status: 400 })
      }
      if (!swift.validated) {
        return NextResponse.json({ error: "SWIFT non validé par l'admin" }, { status: 400 })
      }
      const already = await prisma.auction.findFirst({ where: { swiftReference } })
      if (already) {
        return NextResponse.json({ error: "SWIFT déjà utilisé pour une enchère" }, { status: 400 })
      }
      const allowed30 = Math.round(swift.amount * 0.3)
      const allowed100 = Math.round(swift.amount)
      const mode = conversionMode === "FULL_100" ? "FULL_100" : "IGOC_30"

      if (sourceCurrency !== swift.currency) {
        return NextResponse.json({ error: `La devise source doit être ${swift.currency}` }, { status: 400 })
      }
      if (targetCurrency !== "MAD") {
        return NextResponse.json({ error: "La devise cible doit être MAD" }, { status: 400 })
      }

      // Enforce automatic amount: PME cannot set arbitrary amount
      computedAmount = mode === "IGOC_30" ? allowed30 : allowed100
      // Optional: if client sent amount, ensure it matches computed
      if (amount !== undefined && Number(amount) !== computedAmount) {
        return NextResponse.json({ error: `Montant forcé (${mode === "IGOC_30" ? "30%" : "100%"}) doit être ${computedAmount} ${swift.currency}` }, { status: 400 })
      }
    }

    const id = `AUC-${Date.now()}`
    const auction = await prisma.auction.create({
      data: {
        id,
        companyId: companyRow.id,
        title,
        amount: swiftReference ? (computedAmount as number) : Number(amount),
        sourceCurrency,
        targetCurrency,
        description: description || null,
        duration: parseInt(String(duration)) || 24,
        status: "active",
        createdBy,
        createdAt: new Date(),
        endsAt: new Date(Date.now() + (parseInt(String(duration)) || 24) * 3600 * 1000),
        swiftReference: swiftReference || null,
      },
    })

    return NextResponse.json({ auction, note: conversionMode === "FULL_100" ? "Conversion 100% sélectionnée" : "Conversion IGOC 30% sélectionnée" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create auction" }, { status: 500 })
  }
}
