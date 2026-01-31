"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Gavel } from "lucide-react"

interface Auction {
  id: string
  title: string
  amount: number
  sourceCurrency: string
  targetCurrency: string
  status: string
  createdAt: string
  endsAt: string
  swiftReference: string | null
}

interface ActiveAuctionsListProps {
  auctions: Auction[]
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export default function ActiveAuctionsList({ auctions }: ActiveAuctionsListProps) {
  const activeAuctions = auctions
    .filter(a => a.status === "active")
    .slice(0, 3)

  if (activeAuctions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Enchères actives
          </CardTitle>
          <CardDescription>Aucune enchère active pour le moment</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Enchères actives
            </CardTitle>
            <CardDescription>{activeAuctions.length} enchère(s) en cours</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/pme/active-auctions">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeAuctions.map((auction) => {
            const endsAt = new Date(auction.endsAt)
            const now = new Date()
            const hoursLeft = Math.max(0, Math.round((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60)))
            
            return (
              <div
                key={auction.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{auction.title}</p>
                    <Badge variant="outline" className="bg-green-600/10 text-green-600 border-green-600">
                      Actif
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/70 dark:text-foreground/80">
                    {fmt(auction.amount)} {auction.sourceCurrency.toUpperCase()} → {auction.targetCurrency.toUpperCase()}
                  </p>
                  <p className="text-xs text-foreground/60 dark:text-foreground/70 mt-1">
                    {hoursLeft > 0 ? `${hoursLeft}h restantes` : "Expiré bientôt"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}






