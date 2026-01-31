import { NextRequest, NextResponse } from "next/server"
import { ExchangeRateServiceWithFallback } from "@/lib/exchange-rate-service"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const service = new ExchangeRateServiceWithFallback()
    const rates = await service.getAllRates()

    return NextResponse.json({
      data: rates.rates,
      source: rates.source,
      timestamp: rates.timestamp.toISOString(),
    })
  } catch (e) {
    console.error("[api/bkam/rates] Error:", e)
    // Même en cas d'erreur, le service avec fallback devrait toujours retourner des données
    // Si on arrive ici, c'est une erreur critique
    return NextResponse.json(
      { error: "Failed to fetch rates", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
