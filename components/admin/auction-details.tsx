"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
type DbBid = { id: string; bankName: string; rate: number; charges?: number; timestamp?: string }
type DbAuction = {
  id: string
  title: string
  company?: { name: string }
  amount: number
  sourceCurrency: string
  targetCurrency: string
  description?: string | null
  status: string
  duration?: number
  createdAt: string
  endsAt?: string
  bids: DbBid[]
}
import { TrendingDown, Clock, Award, AlertCircle, FileText } from 'lucide-react'

interface AuctionDetailsProps {
  auctionId: string
  adminId: string
}

export default function AuctionDetails({ auctionId }: AuctionDetailsProps) {
  const [auction, setAuction] = useState<DbAuction | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Array<{ id: string; type: string; fileName: string; createdAt?: string }>>([])
  const [swifts, setSwifts] = useState<Array<{ reference: string; amount: number; currency: string; validated: boolean; createdAt?: string }>>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/auctions/${auctionId}`)
        const json = await res.json()
        const a = json.auction as any
        const mapped: DbAuction = {
          id: a.id,
          title: a.title,
          company: a.company,
          amount: Number(a.amount) || 0,
          sourceCurrency: a.sourceCurrency,
          targetCurrency: a.targetCurrency,
          description: a.description || null,
          status: a.status,
          duration: a.duration || 0,
          createdAt: a.createdAt || new Date().toISOString(),
          endsAt: a.endsAt,
          bids: (a.bids || []).map((b: any) => ({ id: b.id, bankName: b.bankName || '', rate: Number(b.rate) || 0, charges: b.charges, timestamp: b.createdAt })),
        }
        setAuction(mapped)
        const companyName = mapped.company?.name || ''
        if (companyName) {
          const [docsRes, swiftsRes] = await Promise.all([
            fetch(`/api/data/documents?company=${encodeURIComponent(companyName)}`),
            fetch(`/api/data/swifts?company=${encodeURIComponent(companyName)}`),
          ])
          const docsJson = await docsRes.json()
          const swiftsJson = await swiftsRes.json()
          setDocuments((docsJson.documents || []).map((d: any) => ({ id: d.id, type: d.type, fileName: d.fileName, createdAt: d.createdAt })))
          setSwifts((swiftsJson.swifts || []).map((s: any) => ({ reference: s.reference, amount: Number(s.amount) || 0, currency: s.currency, validated: !!s.validated, createdAt: s.createdAt })))
        } else {
          setDocuments([])
          setSwifts([])
        }
      } catch {
        setAuction(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [auctionId])

  if (loading) return <p className="text-muted-foreground">Chargement...</p>
  if (!auction) return <p className="text-muted-foreground">Enchère introuvable</p>

  const bestBid = auction.bids && auction.bids.length > 0 ? auction.bids.reduce((best, b) => (b.rate < best.rate ? b : best)) : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{auction.title || 'Sans titre'}</CardTitle>
              <CardDescription>{auction.id}</CardDescription>
            </div>
            <Badge
              className={
                auction.status === "open"
                  ? "bg-blue-100 text-blue-900"
                  : auction.status === "awarded"
                    ? "bg-accent"
                    : ""
              }
            >
              {auction.status === "open"
                  ? "Ouverte"
                  : auction.status === "closed"
                    ? "Fermée"
                    : "Attribuée"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Montant</p>
              <p className="font-bold text-lg">
                {auction.amount.toLocaleString()} {auction.sourceCurrency}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversion</p>
              <p className="font-bold">{auction.sourceCurrency} → {auction.targetCurrency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PME</p>
              <p className="font-bold">{auction.company?.name || ''}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offres reçues</p>
              <p className="font-bold text-lg">{auction.bids.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date de création</p>
              <p className="text-sm">{new Date(auction.createdAt).toLocaleString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date de fermeture</p>
              <p className="text-sm">{auction.endsAt ? new Date(auction.endsAt).toLocaleString("fr-FR") : ''}</p>
            </div>
          </div>

          {auction.status === "open" && auction.endsAt && new Date(auction.endsAt).getTime() - Date.now() <= 0 && (
            <Alert className="border-amber-500 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-600">Cette enchère a expiré.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button disabled className="w-full">Actions désactivées</Button>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents PME</CardTitle>
          <CardDescription>{documents.length} document(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground">Aucun document</p>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{d.fileName}</p>
                      <p className="text-xs text-muted-foreground">{d.type}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.createdAt ? new Date(d.createdAt).toLocaleString('fr-FR') : ''}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SWIFT PME</CardTitle>
          <CardDescription>{swifts.length} enregistrement(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {swifts.length === 0 ? (
            <p className="text-muted-foreground">Aucun SWIFT</p>
          ) : (
            <div className="space-y-2">
              {swifts.map((s, i) => (
                <div key={`${s.reference}-${i}`} className="p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.reference}</p>
                      <p className="text-xs text-muted-foreground">{s.amount.toLocaleString()} {s.currency}</p>
                    </div>
                    <Badge className={s.validated ? 'bg-green-600' : 'bg-amber-600'}>{s.validated ? 'Validé' : 'En attente'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.createdAt ? new Date(s.createdAt).toLocaleString('fr-FR') : ''}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {bestBid && (
        <Card className="border-accent bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Meilleure offre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Banque</p>
                <p className="font-bold">{bestBid.bankName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux proposé</p>
                <p className="font-bold text-accent text-lg">{bestBid.rate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frais</p>
                <p className="font-bold">{bestBid.charges}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Toutes les offres</CardTitle>
          <CardDescription>{auction.bids.length} offre(s) reçue(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {auction.bids.length === 0 ? (
            <p className="text-muted-foreground">Aucune offre reçue</p>
          ) : (
            <div className="space-y-2">
              {auction.bids
                .sort((a, b) => a.rate - b.rate)
                .map((bid, idx) => (
                  <div
                    key={bid.id}
                    className={`p-3 border rounded-lg flex justify-between items-center ${
                      idx === 0 ? "border-accent bg-accent/5" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium">{bid.bankName}</p>
                      <p className="text-xs text-muted-foreground">{bid.timestamp ? `Offerte à ${new Date(bid.timestamp).toLocaleString("fr-FR")}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{bid.rate}</p>
                      <p className="text-xs text-muted-foreground">{bid.charges}% frais</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
