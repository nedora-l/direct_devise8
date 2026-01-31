"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
type DbAuction = {
  id: string
  title: string
  amount: number
  sourceCurrency: string
  targetCurrency: string
  status: string
  createdAt: string
  endsAt?: string
  swiftReference?: string | null
  company: string
}
type DbSwift = {
  reference: string
  company?: { name: string }
  createdAt?: string
  fileName?: string
  parsedJson?: any
  validated: boolean
  validatedBy?: string
  validatedAt?: string
}
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function PendingOperations() {
  const [operations, setOperations] = useState<DbAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSwift, setSelectedSwift] = useState<DbSwift | null>(null)
  const { toast } = useToast()

  const loadOperations = async () => {
    try {
      const companiesRes = await fetch('/api/data/companies')
      const companiesJson = await companiesRes.json()
      const companies: Array<{ name: string }> = companiesJson.companies || []

      const operations: DbAuction[] = []
      const swiftByCompany: Record<string, DbSwift[]> = {}

      for (const c of companies) {
        const [auctionsRes, swiftsRes] = await Promise.all([
          fetch(`/api/data/auctions?company=${encodeURIComponent(c.name)}`),
          fetch(`/api/data/swifts?company=${encodeURIComponent(c.name)}`),
        ])
        const auctionsJson = await auctionsRes.json()
        const swiftsJson = await swiftsRes.json()
        const swifts: DbSwift[] = (swiftsJson.swifts || []).map((s: any) => ({
          reference: s.reference,
          company: s.company,
          createdAt: s.createdAt,
          fileName: s.parsedJson?.fileName || 'SWIFT',
          parsedJson: s.parsedJson,
          validated: !!s.validated,
          validatedBy: s.validatedBy,
          validatedAt: s.validatedAt,
        }))
        swiftByCompany[c.name] = swifts

        const aucs = (auctionsJson.auctions || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          amount: Number(a.amount) || 0,
          sourceCurrency: a.sourceCurrency,
          targetCurrency: a.targetCurrency,
          status: a.status,
          createdAt: a.createdAt || new Date().toISOString(),
          endsAt: a.endsAt,
          swiftReference: a.swiftReference || null,
          company: c.name,
        }))

        for (const a of aucs) {
          if (a.status !== 'active') continue
          const companySwifts = swiftByCompany[c.name] || []
          const matched = a.swiftReference
            ? companySwifts.find(s => s.reference === a.swiftReference && s.validated)
            : companySwifts.find(s => s.validated)
          if (matched) {
            operations.push(a)
          }
        }
      }

      setOperations(operations)
    } catch {
      setOperations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOperations()
  }, [])

  const handleValidate = (id: string) => {
    toast({
      title: "Opération validée",
      description: "Vous pouvez maintenant soumettre une offre pour cette opération.",
    })
  }

  const handleReject = (id: string) => {
    toast({
      title: "Opération rejetée",
      description: "Cette opération a été masquée de votre liste.",
      variant: "destructive"
    })
    setOperations(prev => prev.filter(op => op.id !== id))
  }

  const handleViewSwift = async (company: string, swiftRef?: string | null) => {
    try {
      const res = await fetch(`/api/data/swifts?company=${encodeURIComponent(company)}`)
      const json = await res.json()
      const swifts: DbSwift[] = (json.swifts || []).map((s: any) => ({
        reference: s.reference,
        company: s.company,
        createdAt: s.createdAt,
        fileName: s.parsedJson?.fileName || 'SWIFT',
        parsedJson: s.parsedJson,
        validated: !!s.validated,
        validatedBy: s.validatedBy,
        validatedAt: s.validatedAt,
      }))
      const swift = (swiftRef
        ? swifts.find(s => s.reference === swiftRef)
        : swifts.find(s => s.validated)) || null
      if (swift) {
        setSelectedSwift(swift)
      } else {
        toast({
          title: "Document introuvable",
          description: "Impossible de charger le document SWIFT.",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Chargement du document SWIFT impossible.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  if (operations.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aucune opération en attente de validation.</p>
        <p className="text-xs text-muted-foreground mt-2">
          Les opérations apparaissent ici uniquement si le KYC et le SWIFT sont validés.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {operations.map((op) => (
          <Card key={op.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold">{op.company}</h3>
                  <p className="text-sm text-muted-foreground">{op.title}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{op.id}</p>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {op.amount.toLocaleString()} {op.sourceCurrency}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date création</p>
                  <p className="text-sm font-mono">{new Date(op.createdAt).toLocaleDateString()} {new Date(op.createdAt).toLocaleTimeString().slice(0,5)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Devise Cible</p>
                  <p className="text-sm font-medium">{op.targetCurrency}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SWIFT</p>
                  <Badge className="mt-1 bg-green-600">Validé</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <Badge variant="secondary" className="mt-1">En cours</Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleValidate(op.id)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Valider & Cotation
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleViewSwift(op.company, op.swiftReference)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Détails SWIFT
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleReject(op.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <XCircle className="mr-2 h-4 w-4" />
                  Refuser
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedSwift} onOpenChange={() => setSelectedSwift(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du Document SWIFT</DialogTitle>
            <DialogDescription>
              Document validé pour {selectedSwift?.company?.name || ''}
            </DialogDescription>
          </DialogHeader>
          {selectedSwift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fichier</p>
                  <p className="text-sm">{selectedSwift.fileName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Upload</p>
                  <p className="text-sm">{selectedSwift.createdAt ? new Date(selectedSwift.createdAt).toLocaleString() : ''}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Montant</p>
                  <p className="text-sm font-bold">{selectedSwift.parsedJson?.amount} {selectedSwift.parsedJson?.currency}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <Badge className="bg-green-600">Validé</Badge>
                </div>
                {selectedSwift.validatedBy && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Validé par</p>
                    <p className="text-sm">{selectedSwift.validatedBy}</p>
                  </div>
                )}
                {selectedSwift.validatedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date validation</p>
                    <p className="text-sm">{new Date(selectedSwift.validatedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selectedSwift.parsedJson?.reference && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Référence</p>
                  <p className="text-sm font-mono">{selectedSwift.parsedJson?.reference}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
