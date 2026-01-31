"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
type DbBid = { id: string; bankName: string; rate: number; charges?: number }
type DbAuction = {
  id: string
  title: string
  company: string
  amount: number
  sourceCurrency: string
  targetCurrency: string
  description?: string | null
  status: string
  duration?: number
  createdAt: string
  endsAt?: string
  swiftReference?: string | null
  rateStrategy?: string | null
  bids: DbBid[]
}
import { Clock, Users, TrendingDown } from 'lucide-react'

interface AuctionsListProps {
  onSelectAuction: (id: string) => void
  onSwitchTab: (tab: string) => void
}

export default function AuctionsList({ onSelectAuction, onSwitchTab }: AuctionsListProps) {
  const [auctions, setAuctions] = useState<DbAuction[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const loadAuctions = async () => {
      try {
        const res = await fetch("/api/data/auctions/all")
        const json = await res.json()
        const raw: any[] = json.auctions || []

        const mapped: DbAuction[] = raw.map((a: any) => {
          // Trouver le SWIFT correspondant si swiftReference existe
          const matchingSwift = a.swiftReference && a.company?.swifts
            ? a.company.swifts.find((s: any) => s.reference === a.swiftReference)
            : null
          
          return {
            id: a.id,
            title: a.title,
            company: a.company?.name || "",
            amount: Number(a.amount) || 0,
            sourceCurrency: a.sourceCurrency,
            targetCurrency: a.targetCurrency,
            description: a.description || null,
            status: a.status,
            duration: a.duration || 0,
            createdAt: a.createdAt || new Date().toISOString(),
            endsAt: a.endsAt,
            swiftReference: a.swiftReference || null,
            rateStrategy: matchingSwift?.rateStrategy || null,
            bids: (a.bids || []).map((b: any) => ({
              id: b.id,
              bankName: b.bankName || "",
              rate: Number(b.rate) || 0,
              charges: b.charges,
            })),
          }
        })

        setAuctions(mapped)

        const open = mapped.filter((a) => a.status === "active").length
        const totalBids = mapped.reduce((sum, a) => sum + a.bids.length, 0)
        const avgParticipants = mapped.length > 0 ? totalBids / mapped.length : 0
        setStats({ total: mapped.length, open, totalBids, averageParticipants: avgParticipants })
      } catch {
        setAuctions([])
        setStats({ total: 0, open: 0, totalBids: 0, averageParticipants: 0 })
      }
    }

    loadAuctions()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>
      case "closed":
        return <Badge variant="secondary">Fermée</Badge>
      case "awarded":
        return <Badge className="bg-blue-600">Attribuée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const renderAuctionCard = (auction: DbAuction) => (
    <Card key={auction.id} className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">{auction.title || 'Sans titre'}</h3>
            <p className="text-sm text-foreground/70 dark:text-foreground/80">PME: {auction.company}</p>
            <p className="text-xs text-foreground/60 dark:text-foreground/70">ID: {auction.id}</p>
          </div>
          {getStatusBadge(auction.status)}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b">
          <div>
            <p className="text-xs text-foreground/70 dark:text-foreground/80">Montant</p>
            <p className="font-bold text-foreground dark:text-foreground">
              {auction.amount.toLocaleString()} {auction.sourceCurrency}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/70 dark:text-foreground/80">Conversion</p>
            <p className="font-semibold text-sm text-foreground dark:text-foreground">
              {auction.sourceCurrency} → {auction.targetCurrency}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/70 dark:text-foreground/80">Offres</p>
            <p className="font-bold">{auction.bids.length}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {auction.bids && auction.bids.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
              <span className="text-sm">Meilleure offre</span>
              {(() => {
                const best = auction.bids.reduce((best, b) => (b.rate < best.rate ? b : best))
                return (
                  <div className="text-right">
                    <p className="font-bold text-green-700 dark:text-green-400">{best.rate}</p>
                    <p className="text-xs text-foreground/70 dark:text-foreground/80">{best.bankName}</p>
                  </div>
                )
              })()}
            </div>
          )}
          {auction.swiftReference && (
            <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                SWIFT: {auction.swiftReference}
              </p>
              {auction.rateStrategy === "spotting" && (
                <p className="text-xs text-green-700 dark:text-green-400 font-medium mt-1">
                  ✓ Créée depuis spotting
                </p>
              )}
              {auction.rateStrategy === "auction" && (
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-1">
                  Enchère directe
                </p>
              )}
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70 dark:text-foreground/80 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Durée
            </span>
            <span className="font-medium text-foreground dark:text-foreground">{auction.duration || 0}h</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70 dark:text-foreground/80">Créé le</span>
            <span className="font-medium">{new Date(auction.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        <Button
          onClick={() => {
            onSelectAuction(auction.id)
            onSwitchTab("details")
          }}
          variant="outline"
          className="w-full"
        >
          Voir détails
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Ouvertes</p>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total offres</p>
              <p className="text-2xl font-bold text-amber-600">{stats.totalBids}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Moy. participants</p>
              <p className="text-2xl font-bold text-accent">{stats.averageParticipants.toFixed(1)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="open">Ouvertes</TabsTrigger>
          <TabsTrigger value="closed">Fermées</TabsTrigger>
          <TabsTrigger value="awarded">Attribuées</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {auctions.length === 0 ? (
            <Card>
              <CardContent className="pt-12 text-center">
                <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune enchère créée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auctions.map((a) => renderAuctionCard(a))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="open">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auctions.filter((a) => a.status === "active").map((a) => renderAuctionCard(a))}
          </div>
          {auctions.filter((a) => a.status === "active").length === 0 && (
            <Card>
              <CardContent className="pt-12 text-center">
                <p className="text-muted-foreground">Aucune enchère ouverte</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="closed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auctions.filter((a) => a.status === "closed").map((a) => renderAuctionCard(a))}
          </div>
          {auctions.filter((a) => a.status === "closed").length === 0 && (
            <Card>
              <CardContent className="pt-12 text-center">
                <p className="text-muted-foreground">Aucune enchère fermée</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="awarded">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auctions.filter((a) => a.status === "awarded").map((a) => renderAuctionCard(a))}
          </div>
          {auctions.filter((a) => a.status === "awarded").length === 0 && (
            <Card>
              <CardContent className="pt-12 text-center">
                <p className="text-muted-foreground">Aucune enchère attribuée</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
