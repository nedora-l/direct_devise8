"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function DealSelection() {
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null)

  const bankOffers = [
    { id: "OFFER-1", rate: 11.35, amount: 8500, currency: "EUR", volume: "Disponible", winner: false },
    { id: "OFFER-2", rate: 11.32, amount: 8500, currency: "EUR", volume: "Disponible", winner: true },
    { id: "OFFER-3", rate: 11.28, amount: 8500, currency: "EUR", volume: "Limité", winner: false },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sélection du Meilleur Taux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {bankOffers.map((offer) => (
              <div
                key={offer.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedDeal === offer.id ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                }`}
                onClick={() => setSelectedDeal(offer.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono font-bold text-lg">{offer.rate}</p>
                    <p className="text-sm text-muted-foreground">
                      {offer.amount} {offer.currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={offer.winner ? "default" : "outline"}>{offer.volume}</Badge>
                    {offer.winner && <p className="text-xs text-accent mt-1">Taux recommandé</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedDeal && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                Offre sélectionnée: <span className="font-bold">{selectedDeal}</span>
              </p>
            </div>
          )}

          <Button className="w-full" disabled={!selectedDeal}>
            Proposer au Client
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
