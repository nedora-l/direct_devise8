import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session as any).user?.role !== "pme") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { swiftId, strategy, targetRate, targetCurrency, splitMode } = body

    console.log("[swift/set-strategy] Request body:", { swiftId, strategy, targetRate, targetCurrency, splitMode })

    if (!swiftId || !strategy) {
      return NextResponse.json({ error: "swiftId et strategy requis" }, { status: 400 })
    }

    if (strategy === "spotting" && (!targetRate || !targetCurrency)) {
      return NextResponse.json({ error: "targetRate et targetCurrency requis pour spotting" }, { status: 400 })
    }

    const prisma = getPrisma()
    const userId = (session as any).user.id as string
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })

    if (!user || !user.company) {
      console.error("[swift/set-strategy] User or company not found for userId:", userId)
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Vérifier que le SWIFT appartient à l'entreprise et est validé
    const swift = await prisma.swift.findUnique({
      where: { id: swiftId },
    })

    if (!swift) {
      console.error("[swift/set-strategy] SWIFT not found:", swiftId)
      return NextResponse.json({ error: "SWIFT non trouvé" }, { status: 404 })
    }

    if (swift.companyId !== user.company.id) {
      console.error("[swift/set-strategy] SWIFT unauthorized. swift.companyId:", swift.companyId, "user.company.id:", user.company.id)
      return NextResponse.json({ error: "SWIFT non autorisé" }, { status: 403 })
    }

    if (!swift.validated || swift.adminStatus !== "approved") {
      console.error("[swift/set-strategy] SWIFT not validated. validated:", swift.validated, "adminStatus:", swift.adminStatus)
      return NextResponse.json({ error: "SWIFT non validé" }, { status: 403 })
    }

    // Mettre à jour la stratégie
    const updateData: {
      rateStrategy: string
      targetRate: number | null
      targetCurrency: string | null
      splitMode: string | null
    } = {
      rateStrategy: strategy,
      targetRate: strategy === "spotting" ? parseFloat(String(targetRate)) : null,
      targetCurrency: strategy === "spotting" ? targetCurrency : null,
      splitMode: splitMode || "IGOC_30",
    }

    console.log("[swift/set-strategy] Updating SWIFT with data:", updateData)

    const updated = await prisma.swift.update({
      where: { id: swiftId },
      data: updateData,
    })

    console.log("[swift/set-strategy] SWIFT updated successfully:", updated.id)

    return NextResponse.json({ swift: updated })
  } catch (error) {
    console.error("[swift/set-strategy] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to set strategy"
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : { error: String(error) }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    )
  }
}

