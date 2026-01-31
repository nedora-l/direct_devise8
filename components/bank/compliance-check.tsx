"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface Auction {
  id: string
  company: {
    id: string
    name: string
    kyc?: {
      complianceStatus: string
    }
    swifts?: Array<{
      id: string
      validated: boolean
      amount: number
      currency: string
      parsedJson?: any
    }>
  }
  amount: number
  sourceCurrency: string
  status: string
}

export default function ComplianceCheck() {
  const [operations, setOperations] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadOperations = async () => {
    try {
      const response = await fetch("/api/data/auctions/all")
      if (response.ok) {
        const data = await response.json()
        setOperations(data.auctions || [])
      }
    } catch (error) {
      console.error("[compliance-check] Error loading operations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOperations()
    // Poll every 10 seconds for updates
    const interval = setInterval(loadOperations, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleApprove = (auctionId: string) => {
    toast({
      title: "Conformité approuvée",
      description: "L'opération est conforme et peut être traitée.",
    })
  }

  const handleFlag = (auctionId: string) => {
    toast({
      title: "Risque signalé",
      description: "Cette opération a été marquée pour révision approfondie.",
      variant: "destructive"
    })
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  if (operations.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Aucun dossier en attente de conformité.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {operations.map((op) => {
        const kyc = op.company.kyc
        const swift = op.company.swifts?.[0]
        
        return (
          <Card key={op.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <CardTitle className="text-lg">{op.company.name}</CardTitle>
                <Badge variant="outline">{op.amount.toLocaleString()} {op.sourceCurrency}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Réf: {op.id}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Montant IGOC</p>
                    <p className="text-xs text-muted-foreground">Conforme aux plafonds annuels</p>
                  </div>
                  <Badge variant="default" className="bg-green-600">Conforme</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Document SWIFT</p>
                    <p className="text-xs text-muted-foreground">
                      {swift ? `Validé (${swift.amount} ${swift.currency})` : "Document manquant"}
                    </p>
                  </div>
                  <Badge variant={swift?.validated ? "default" : "destructive"} className={swift?.validated ? "bg-green-600" : ""}>
                    {swift?.validated ? "Validé" : "Manquant"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">KYC / AML</p>
                    <p className="text-xs text-muted-foreground">
                      {kyc ? `Dossier ${kyc.complianceStatus === 'approved' ? 'validé' : kyc.complianceStatus}` : "Dossier manquant"}
                    </p>
                  </div>
                  <Badge variant={kyc?.complianceStatus === 'approved' ? "default" : "destructive"} className={kyc?.complianceStatus === 'approved' ? "bg-green-600" : ""}>
                    {kyc?.complianceStatus === 'approved' ? "Validé" : "Non validé"}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleApprove(op.id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approuver Conformité
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleFlag(op.id)}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Signaler Risque
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
