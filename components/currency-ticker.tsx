'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface RateData {
  code: string
  symbol: string
  rate: number
  change: number
  source?: "bkam" | "mock"
}

export function CurrencyTicker() {
  const [rates, setRates] = useState<RateData[]>([])
  const [animate, setAnimate] = useState(false)
  const [previousRates, setPreviousRates] = useState<Record<string, number>>({})

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/bkam/rates')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      // Convert BKAM format to ticker format
      const newRates: RateData[] = []
      const ratesData = data.data || {}
      const source = data.source || "mock"

      // Map common currency pairs
      const currencyMap: Record<string, { symbol: string; pair: string }> = {
        "EUR": { symbol: "EUR", pair: "EUR/MAD" },
        "GBP": { symbol: "GBP", pair: "GBP/MAD" },
        "JPY": { symbol: "JPY", pair: "JPY/MAD" },
        "XOF": { symbol: "XOF", pair: "XOF/MAD" },
      }

      Object.entries(currencyMap).forEach(([key, { symbol, pair }]) => {
        const rate = ratesData[pair] || ratesData[pair.toUpperCase()]
        if (rate && typeof rate === 'number') {
          const previousRate = previousRates[symbol] || rate
          const change = rate - previousRate
          newRates.push({
            code: pair,
            symbol,
            rate,
            change,
            source,
          })
        }
      })

      if (newRates.length > 0) {
        setPreviousRates(
          Object.fromEntries(newRates.map(r => [r.symbol, r.rate]))
        )
        setRates(newRates)
      }
    } catch (err) {
      console.error("[CurrencyTicker] Error fetching rates:", err)
      // Keep previous rates on error
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchRates()
    
    // Update every 30 seconds (au lieu de 3 secondes pour éviter trop de requêtes)
    const interval = setInterval(() => {
      setAnimate(true)
      setTimeout(() => {
        fetchRates()
        setAnimate(false)
      }, 300)
    }, 30000) // 30 secondes

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex gap-4 px-4 py-2 overflow-x-auto bg-card border-b border-border">
      {rates.map((rate) => (
        <div
          key={rate.code}
          className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-background/50 whitespace-nowrap transition-opacity duration-300 ${
            animate ? 'opacity-70' : 'opacity-100'
          }`}
        >
          <span className="font-semibold text-sm text-primary">{rate.symbol}</span>
          <span className="text-sm font-mono">
            {rate.rate.toFixed(4)}
          </span>
          {rate.change >= 0 ? (
            <TrendingUp className="w-4 h-4 text-accent" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
        </div>
      ))}
    </div>
  )
}
