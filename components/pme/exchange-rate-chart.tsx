"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function ExchangeRateChart() {
  const [period, setPeriod] = useState("month")
  const [currency, setCurrency] = useState("EUR")

  const data = [
    { date: "01 Jan", rate: 11.15, market: 11.1 },
    { date: "05 Jan", rate: 11.22, market: 11.2 },
    { date: "10 Jan", rate: 11.3, market: 11.25 },
    { date: "15 Jan", rate: 11.25, market: 11.23 },
    { date: "20 Jan", rate: 11.35, market: 11.28 },
    { date: "25 Jan", rate: 11.32, market: 11.3 },
    { date: "01 Feb", rate: 11.4, market: 11.38 },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semaine</SelectItem>
            <SelectItem value="month">Mois</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="year">Année</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR/MAD</SelectItem>
            <SelectItem value="USD">USD/MAD</SelectItem>
            <SelectItem value="GBP">GBP/MAD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
          <YAxis stroke="var(--color-muted-foreground)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: `1px solid var(--color-border)`,
              color: "var(--color-foreground)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="var(--color-primary)"
            strokeWidth={2}
            name="Votre Taux"
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="market"
            stroke="var(--color-muted-foreground)"
            strokeWidth={1}
            strokeDasharray="5 5"
            name="Taux Marché"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Moyenne</p>
          <p className="font-bold">11.28</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Meilleur</p>
          <p className="font-bold text-accent">11.40</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Pire</p>
          <p className="font-bold">11.15</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Écart-type</p>
          <p className="font-bold">0.09</p>
        </div>
      </div>
    </div>
  )
}
