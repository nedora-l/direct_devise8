import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { ExchangeRateServiceWithFallback } from "@/lib/exchange-rate-service"

export const runtime = "nodejs"

/**
 * Endpoint pour vérifier si les taux cibles sont atteints pour les SWIFT en mode "spotting"
 * À appeler périodiquement (cron job) ou via webhook
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session as any).user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = getPrisma()
    const service = new ExchangeRateServiceWithFallback()

    // Récupérer tous les SWIFT en mode "spotting" non expirés et non déclenchés
    const now = new Date()
    const spottingSwifts = await prisma.swift.findMany({
      where: {
        rateStrategy: "spotting",
        targetRate: { not: null },
        targetCurrency: { not: null },
        rateTriggeredAt: null, // Pas encore déclenché
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }, // Non expiré
        ],
        validated: true,
        adminStatus: "approved",
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    })

    const triggered: Array<{ swiftId: string; reference: string; rate: number; targetRate: number }> = []

    for (const swift of spottingSwifts) {
      if (!swift.targetRate || !swift.targetCurrency) continue

      try {
        // Récupérer le taux actuel
        const rateResponse = await service.getRate(swift.targetCurrency)
        const currentRate = rateResponse.rate
        const targetRate = Number(swift.targetRate)

        // Vérifier si le taux cible est atteint (avec une tolérance de 0.1%)
        const tolerance = targetRate * 0.001
        if (Math.abs(currentRate - targetRate) <= tolerance || currentRate >= targetRate) {
          // Taux atteint ! Déclencher la validation
          await prisma.swift.update({
            where: { id: swift.id },
            data: {
              rateTriggeredAt: new Date(),
              // Optionnel : créer automatiquement une enchère
              // Pour l'instant, on marque juste comme déclenché
            },
          })

          triggered.push({
            swiftId: swift.id,
            reference: swift.reference,
            rate: currentRate,
            targetRate: targetRate,
          })

          console.log(
            `[swift/check-rates] Taux atteint pour SWIFT ${swift.reference}: ` +
            `${currentRate} >= ${targetRate} (source: ${rateResponse.source})`
          )
        }
      } catch (error) {
        console.error(`[swift/check-rates] Error checking rate for SWIFT ${swift.reference}:`, error)
        // Continue avec les autres SWIFT
      }
    }

    return NextResponse.json({
      checked: spottingSwifts.length,
      triggered: triggered.length,
      triggeredSwifts: triggered,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[swift/check-rates] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check rates" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint pour vérifier manuellement (utile pour tests)
 */
export async function GET(req: NextRequest) {
  return POST(req)
}






