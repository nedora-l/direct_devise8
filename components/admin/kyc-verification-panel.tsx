'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

interface KYCSubmission {
  company: string
  companyInfo: {
    name: string
    email: string
    phone?: string
    sector?: string
    siret?: string
  }
  documents: any[]
  completeness: number
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  publishedAt: string
  analysis?: {
    riskScore: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    confidenceScore: number
    recommendation: string
    findings: string[]
    alerts?: string[]
    amlFlags?: string[]
  }
}

export default function KYCVerificationPanel() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSubmissions()
    // Poll every 5 seconds for updates
    const interval = setInterval(loadSubmissions, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadSubmissions = async () => {
    try {
      const response = await fetch("/api/kyc/profile/all?status=pending")
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error("[kyc-panel] Error loading submissions:", error)
    }
  }

  const handleApprove = async (companyId: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/kyc/profile/all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          status: "approved",
          notes: reviewNotes,
        }),
      })

      if (response.ok) {
        await loadSubmissions()
      }
    } catch (error) {
      console.error("[kyc-panel] Error approving:", error)
    } finally {
      setLoading(false)
      setReviewNotes('')
      setSelectedId(null)
    }
  }

  const handleReject = async (companyId: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/kyc/profile/all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          status: "rejected",
          notes: reviewNotes,
        }),
      })

      if (response.ok) {
        await loadSubmissions()
      }
    } catch (error) {
      console.error("[kyc-panel] Error rejecting:", error)
    } finally {
      setLoading(false)
      setReviewNotes('')
      setSelectedId(null)
    }
  }

  const selected = selectedId ? submissions.find(s => s.companyId === selectedId) : null
  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'reviewing').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vérification KYC</h2>
          <p className="text-muted-foreground">Révision et approbation des dossiers KYC</p>
        </div>
        <Badge variant="default" className="text-lg px-3 py-1">
          {pendingCount} en attente
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Aucun dossier KYC
                </CardContent>
              </Card>
            ) : (
              submissions.map(sub => (
                <Card
                  key={sub.companyId}
                  className={`cursor-pointer transition-all ${selectedId === sub.companyId ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedId(sub.companyId)}
                >
                  <CardContent className="pt-4">
                    <p className="font-medium">{sub.companyInfo.name}</p>
                    <p className="text-xs text-muted-foreground">{sub.companyInfo.email}</p>
                    <Badge className="mt-2" variant={
                      sub.status === 'approved' ? 'default' :
                      sub.status === 'rejected' ? 'destructive' :
                      sub.status === 'reviewing' ? 'secondary' : 'outline'
                    }>
                      {sub.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle>{selected.companyInfo.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-2">Informations</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{selected.companyInfo.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Téléphone:</span>
                      <span>{selected.companyInfo.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Secteur:</span>
                      <span>{selected.companyInfo.sector || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Complétude:</span>
                      <span>{selected.completeness}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Documents ({selected.documents.length})</p>
                  <div className="space-y-2">
                    {selected.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{doc.fileName}</span>
                        <Badge variant="default">
                          {doc.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.analysis && (
                  <div>
                    <p className="text-sm font-medium mb-2">Analyse Agent LLM</p>
                    <div className="p-3 bg-muted rounded space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Risque:</span>
                        <Badge variant={
                          selected.analysis.riskLevel === 'LOW' ? 'default' :
                          selected.analysis.riskLevel === 'MEDIUM' ? 'secondary' : 'destructive'
                        }>
                          {selected.analysis.riskLevel}
                        </Badge>
                        <span className="text-sm ml-auto">Score: {selected.analysis.riskScore}/100</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Résultats:</p>
                        <ul className="text-xs space-y-1 mt-1">
                          {selected.analysis.findings.map((finding, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-muted-foreground">•</span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Notes de révision</p>
                  <Textarea
                    placeholder="Ajoutez vos notes..."
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selected.companyId)}
                    disabled={loading || selected.status === 'approved'}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Approuver
                  </Button>
                  <Button
                    onClick={() => handleReject(selected.companyId)}
                    disabled={loading || selected.status === 'rejected'}
                    variant="destructive"
                    className="flex-1"
                  >
                    Rejeter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Sélectionnez un dossier KYC pour voir les détails
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
