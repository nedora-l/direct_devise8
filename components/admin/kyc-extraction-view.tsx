"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ExtractionViewProps {
  companyId: string
  documents: Array<{ id: string; type: string; fileName: string }>
}

interface ExtractionResult {
  extractedData?: {
    legalName?: string
    registrationNumber?: string
    taxId?: string
    address?: string
    city?: string
    ocrScore?: number
    agentScore?: number
    finalScore?: number
    ocrData?: any
    agentData?: any
    flags?: string[]
  }
  ventAgentWarning?: string
}

export default function KYCExtractionView({ companyId, documents }: ExtractionViewProps) {
  const [loading, setLoading] = useState(false)
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState("")

  const loadExtraction = async () => {
    setLoading(true)
    setError("")
    try {
      // First check if vent agent is available
      const ventCheck = await fetch("/api/test/vent-agent").catch(() => null)
      const ventStatus = ventCheck?.ok ? await ventCheck.json().catch(() => ({})) : null
      
      const response = await fetch("/api/kyc/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur ${response.status} lors de l'extraction`)
      }

      const result = await response.json()
      console.log("[KYCExtractionView] Extraction result:", result)
      
      // Add vent agent status to result
      if (ventStatus && !ventStatus.configured) {
        result.ventAgentWarning = "Agent ventilation non configuré"
      } else if (ventStatus && ventStatus.health !== "OK") {
        result.ventAgentWarning = `Agent ventilation non accessible: ${ventStatus.error || "Serveur non démarré"}`
      }
      
      setExtraction(result)
    } catch (err) {
      console.error("[KYCExtractionView] Extraction error:", err)
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (documents.length > 0) {
      loadExtraction()
    }
  }, [companyId, documents.length])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const data = extraction?.extractedData
  if (!data) {
    return null
  }

  const finalScore = data.finalScore || 0
  const scoreColor = finalScore >= 80 ? "text-green-600" : finalScore >= 50 ? "text-amber-600" : "text-red-600"
  const scoreBadge = finalScore >= 80 ? "bg-green-600" : finalScore >= 50 ? "bg-amber-600" : "bg-red-600"

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Analyse OCR & Agent KYC
        </CardTitle>
        <CardDescription>
          Double validation avec scoring comparatif
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning if vent agent is not available */}
        {extraction?.ventAgentWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Agent ventilation non accessible:</strong> {extraction.ventAgentWarning}
              <br />
              <span className="text-xs mt-1 block">
                Pour activer l'OCR, démarrez l'agent ventilation sur <code className="bg-muted px-1 rounded">http://localhost:8787</code>
                <br />
                Le score OCR sera à 0% tant que l'agent n'est pas démarré.
              </span>
            </AlertDescription>
          </Alert>
        )}
        {/* Score Global */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Score Final</span>
            <Badge className={scoreBadge}>
              {finalScore}%
            </Badge>
          </div>
          <Progress value={finalScore} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Calcul: (OCR {data.ocrScore || 0}% × 40%) + (Agent {data.agentScore || 0}% × 60%)
          </p>
        </div>

        {/* Scores Comparatifs */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Score OCR</p>
                <p className="text-2xl font-bold">{data.ocrScore || 0}%</p>
                <Progress value={data.ocrScore || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Score Agent</p>
                <p className="text-2xl font-bold">{data.agentScore || 0}%</p>
                <Progress value={data.agentScore || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Données Extraites */}
        {data.legalName || data.registrationNumber || data.taxId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Données Extraites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.legalName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom légal:</span>
                  <span className="font-medium">{data.legalName}</span>
                </div>
              )}
              {data.registrationNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RC:</span>
                  <span className="font-medium">{data.registrationNumber}</span>
                </div>
              )}
              {data.taxId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ICE:</span>
                  <span className="font-medium">{data.taxId}</span>
                </div>
              )}
              {data.address && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adresse:</span>
                  <span className="font-medium">{data.address}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <AlertDescription>
              Aucune donnée extraite automatiquement. Remplissage manuel requis.
            </AlertDescription>
          </Alert>
        )}

        {/* Show sector if available */}
        {data.agentData?.companyInfo?.sector && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Secteur d'activité: <strong>{data.agentData.companyInfo.sector}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Flags d'Anomalies */}
        {data.flags && data.flags.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Anomalies détectées:</p>
              <ul className="list-disc list-inside text-xs">
                {data.flags
                  .filter(flag => {
                    // Don't show "secteur manquant" if sector is available
                    if (flag.includes("Secteur d'activité") && data.agentData?.companyInfo?.sector) {
                      return false
                    }
                    return true
                  })
                  .map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Show sector if available */}
        {data.agentData?.companyInfo?.sector && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Secteur d'activité: <strong>{data.agentData.companyInfo.sector}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Détails par Document */}
        {data.ocrData && Array.isArray(data.ocrData) && data.ocrData.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="details">
              <AccordionTrigger className="text-sm">Détails par document</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-xs">
                  {data.ocrData.map((ocr: any, i: number) => (
                    <div key={i} className="p-2 border rounded">
                      <p className="font-medium mb-1">{ocr.docType?.toUpperCase()}</p>
                      <p className="text-muted-foreground">
                        {ocr.data ? "Données extraites" : "Aucune donnée"}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <Button onClick={loadExtraction} variant="outline" size="sm" className="w-full">
          <Loader2 className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Re-analyser
        </Button>
      </CardContent>
    </Card>
  )
}

