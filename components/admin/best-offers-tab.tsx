"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp } from "lucide-react"

export function BestOffersTab() {
  const offers = [
    {
      id: "OFFER-20250115-001",
      bank: "BMCE Bank",
      rate: 11.3,
      volume: 8500,
      time: "60 min",
      status: "selected",
    },
    {
      id: "OFFER-20250115-002",
      bank: "BADR Bank",
      rate: 11.28,
      volume: 8500,
      time: "90 min",
      status: "new",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Meilleures Offres Reçues
        </CardTitle>
        <CardDescription>Réception temps réel des taux bancaires</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {offers.map((offer) => (
          <div key={offer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
            <div className="space-y-1">
              <p className="font-bold">{offer.bank}</p>
              <p className="text-sm text-muted-foreground">{offer.volume} EUR</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold text-accent">{offer.rate}</p>
              <p className="text-xs text-muted-foreground">{offer.time}</p>
            </div>
            <Badge
              className={
                offer.status === "selected" ? "bg-green-500/20 text-green-700" : "bg-blue-500/20 text-blue-700"
              }
            >
              {offer.status === "selected" ? "Sélectionné" : "Nouveau"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
