'use client'

export interface ExchangeRate {
  symbol: string
  code: string
  rate: number
  change: number
  lastUpdated: Date
  source?: "bkam" | "mock"
}

/**
 * @deprecated Utiliser directement /api/bkam/rates au lieu de cette fonction
 * Conservé pour compatibilité temporaire
 */
export async function getLiveRates(): Promise<ExchangeRate[]> {
  try {
    const res = await fetch('/api/bkam/rates')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    
    const rates: ExchangeRate[] = []
    const ratesData = data.data || {}
    const source = data.source || "mock"

    const currencyMap: Record<string, { symbol: string; pair: string }> = {
      "EUR": { symbol: "EUR", pair: "EUR/MAD" },
      "GBP": { symbol: "GBP", pair: "GBP/MAD" },
      "JPY": { symbol: "JPY", pair: "JPY/MAD" },
      "XOF": { symbol: "XOF", pair: "XOF/MAD" },
    }

    Object.entries(currencyMap).forEach(([key, { symbol, pair }]) => {
      const rate = ratesData[pair] || ratesData[pair.toUpperCase()]
      if (rate && typeof rate === 'number') {
        rates.push({
          symbol,
          code: pair,
          rate,
          change: 0, // Calculé ailleurs si nécessaire
          lastUpdated: new Date(data.timestamp || Date.now()),
          source,
        })
      }
    })

    return rates
  } catch (err) {
    console.error("[currency-service] Error fetching rates:", err)
    // Fallback vers taux par défaut en cas d'erreur
    return [
      { symbol: 'EUR', code: 'EUR/MAD', rate: 10.5, change: 0, lastUpdated: new Date(), source: "mock" },
      { symbol: 'GBP', code: 'GBP/MAD', rate: 12.4, change: 0, lastUpdated: new Date(), source: "mock" },
      { symbol: 'JPY', code: 'JPY/MAD', rate: 0.065, change: 0, lastUpdated: new Date(), source: "mock" },
      { symbol: 'XOF', code: 'XOF/MAD', rate: 0.016, change: 0, lastUpdated: new Date(), source: "mock" },
    ]
  }
}
