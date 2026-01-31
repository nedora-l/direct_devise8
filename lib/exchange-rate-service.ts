/**
 * Service abstrait pour les taux de change
 * Architecture modulaire : API réelle BKAM + fallback mock superficiel
 * Facilite la migration mock → réel via configuration uniquement
 */

export interface ExchangeRateResponse {
  currencyPair: string // "EUR/MAD", "USD/MAD", etc.
  rate: number
  source: "bkam" | "mock"
  timestamp: Date
  expiresAt?: Date
}

export interface BKAMRateResponse {
  rates: Record<string, number> // { "EUR/MAD": 10.5, "USD/MAD": 9.8, ... }
  timestamp: Date
  source: "bkam" | "mock"
}

/**
 * Service abstrait pour récupérer les taux de change
 */
export interface ExchangeRateService {
  getRate(currencyPair: string): Promise<ExchangeRateResponse>
  getAllRates(): Promise<BKAMRateResponse>
}

/**
 * Implémentation pour les APIs réelles de Bank Al-Maghrib
 */
class BKAMExchangeRateService implements ExchangeRateService {
  private baseUrl: string
  private timeout: number = 5000 // 5 secondes

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async getRate(currencyPair: string): Promise<ExchangeRateResponse> {
    try {
      const allRates = await this.getAllRates()
      const rate = allRates.rates[currencyPair.toUpperCase()]
      
      if (rate === undefined) {
        throw new Error(`Taux non trouvé pour ${currencyPair}`)
      }

      return {
        currencyPair: currencyPair.toUpperCase(),
        rate,
        source: "bkam",
        timestamp: allRates.timestamp,
      }
    } catch (error) {
      console.error("[BKAMExchangeRateService] Error fetching rate:", error)
      throw error
    }
  }

  async getAllRates(): Promise<BKAMRateResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(this.baseUrl, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`BKAM API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Parser la réponse BKAM selon le format réel (à adapter selon l'API)
      // Format attendu : { rates: { "EUR/MAD": 10.5, ... }, date: "..." }
      const rates = this.parseBKAMResponse(data)

      return {
        rates,
        timestamp: new Date(),
        source: "bkam",
      }
    } catch (error) {
      console.error("[BKAMExchangeRateService] Error fetching rates:", error)
      throw error
    }
  }

  /**
   * Parse la réponse de l'API BKAM
   * À adapter selon le format réel de l'API BKAM
   */
  private parseBKAMResponse(data: any): Record<string, number> {
    // Format 1 : { rates: { "EUR/MAD": 10.5, ... } }
    if (data.rates && typeof data.rates === 'object') {
      return data.rates
    }

    // Format 2 : { data: [{ currency: "EUR", rate: 10.5 }, ...] }
    if (Array.isArray(data.data)) {
      const rates: Record<string, number> = {}
      data.data.forEach((item: any) => {
        if (item.currency && item.rate) {
          rates[`${item.currency}/MAD`] = parseFloat(String(item.rate))
        }
      })
      return rates
    }

    // Format 3 : { EUR: 10.5, USD: 9.8, ... } (devises vers MAD)
    if (typeof data === 'object' && !data.rates) {
      const rates: Record<string, number> = {}
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number' && key.length === 3) {
          rates[`${key}/MAD`] = value
        }
      })
      if (Object.keys(rates).length > 0) {
        return rates
      }
    }

    // Si format inconnu, retourner vide (sera géré par le fallback)
    console.warn("[BKAMExchangeRateService] Format de réponse BKAM non reconnu:", data)
    return {}
  }
}

/**
 * Implémentation mock superficielle (calculée à la volée, pas de persistence)
 * Utilisée uniquement en fallback si API BKAM indisponible
 */
class MockExchangeRateService implements ExchangeRateService {
  // Taux de base réalistes (basés sur les taux moyens observés)
  private baseRates: Record<string, number> = {
    "EUR/MAD": 10.5,
    "USD/MAD": 9.8,
    "GBP/MAD": 12.4,
    "JPY/MAD": 0.065,
    "XOF/MAD": 0.016,
    "CHF/MAD": 10.8,
  }

  async getRate(currencyPair: string): Promise<ExchangeRateResponse> {
    const pair = currencyPair.toUpperCase()
    const rate = this.baseRates[pair] || this.estimateRate(pair)
    
    // Ajouter une petite variation aléatoire pour simuler la volatilité
    const variation = (Math.random() - 0.5) * 0.02 // ±1%
    const finalRate = rate * (1 + variation)

    return {
      currencyPair: pair,
      rate: parseFloat(finalRate.toFixed(4)),
      source: "mock",
      timestamp: new Date(),
    }
  }

  async getAllRates(): Promise<BKAMRateResponse> {
    const rates: Record<string, number> = {}
    
    for (const [pair, baseRate] of Object.entries(this.baseRates)) {
      const variation = (Math.random() - 0.5) * 0.02
      rates[pair] = parseFloat((baseRate * (1 + variation)).toFixed(4))
    }

    return {
      rates,
      timestamp: new Date(),
      source: "mock",
    }
  }

  /**
   * Estime un taux pour une paire non définie (basé sur USD comme référence)
   */
  private estimateRate(currencyPair: string): number {
    const [base, quote] = currencyPair.split('/')
    if (quote !== 'MAD') {
      // Si pas vers MAD, utiliser USD comme intermédiaire
      const baseToUSD = this.getBaseToUSD(base)
      const usdToMAD = this.baseRates["USD/MAD"]
      return baseToUSD * usdToMAD
    }
    
    // Estimation basique si devise inconnue
    return 10.0
  }

  private getBaseToUSD(currency: string): number {
    const rates: Record<string, number> = {
      "EUR": 1.09,
      "GBP": 1.27,
      "JPY": 149.5,
      "CHF": 0.92,
    }
    return rates[currency] || 1.0
  }
}

/**
 * Factory pour créer le service approprié selon la configuration
 */
export function createExchangeRateService(): ExchangeRateService {
  const useMock = process.env.BKAM_USE_MOCK === "true"
  const bkamUrl = process.env.BKAM_RATES_URL

  if (useMock || !bkamUrl) {
    console.log("[ExchangeRateService] Using mock service (BKAM_USE_MOCK=true or BKAM_RATES_URL not set)")
    return new MockExchangeRateService()
  }

  console.log("[ExchangeRateService] Using BKAM real API:", bkamUrl)
  return new BKAMExchangeRateService(bkamUrl)
}

/**
 * Service avec fallback automatique : essaie BKAM réel, puis mock si échec
 */
export class ExchangeRateServiceWithFallback implements ExchangeRateService {
  private bkamService: BKAMExchangeRateService | null = null
  private mockService: MockExchangeRateService

  constructor() {
    this.mockService = new MockExchangeRateService()
    
    const bkamUrl = process.env.BKAM_RATES_URL
    if (bkamUrl && process.env.BKAM_USE_MOCK !== "true") {
      this.bkamService = new BKAMExchangeRateService(bkamUrl)
    }
  }

  async getRate(currencyPair: string): Promise<ExchangeRateResponse> {
    if (this.bkamService) {
      try {
        return await this.bkamService.getRate(currencyPair)
      } catch (error) {
        console.warn("[ExchangeRateServiceWithFallback] BKAM failed, using mock:", error)
        // Fallback automatique vers mock
        return await this.mockService.getRate(currencyPair)
      }
    }

    // Pas de service BKAM configuré, utiliser mock directement
    return await this.mockService.getRate(currencyPair)
  }

  async getAllRates(): Promise<BKAMRateResponse> {
    if (this.bkamService) {
      try {
        return await this.bkamService.getAllRates()
      } catch (error) {
        console.warn("[ExchangeRateServiceWithFallback] BKAM failed, using mock:", error)
        // Fallback automatique vers mock
        return await this.mockService.getAllRates()
      }
    }

    // Pas de service BKAM configuré, utiliser mock directement
    return await this.mockService.getAllRates()
  }
}






