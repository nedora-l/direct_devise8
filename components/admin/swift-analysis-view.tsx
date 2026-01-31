"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertTriangle, FileText, RefreshCw } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface SwiftAnalysisViewProps {
  swiftId: string
}

interface AnalysisReport {
  ocr: {
    score: number
    valid: boolean
    errors: string[]
    extractedFields: any
  }
  agent: {
    score: number
    validation: boolean
    confidence: string
    findings: string[]
  }
  aml: {
    score: number
    riskLevel: string
    flags: string[]
  }
  combined: {
    finalScore: number
    recommendation: string
    summary: string
  }
}

export default function SwiftAnalysisView({ swiftId }: SwiftAnalysisViewProps) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [error, setError] = useState("")

  const loadAnalysis = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/swift/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swiftId }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'analyse")
      }

      const result = await response.json()
      setReport(result.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (swiftId) {
      loadAnalysis()
    }
  }, [swiftId])

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

  if (!report) {
    return null
  }

  const finalScore = report.combined.finalScore
  const scoreColor = finalScore >= 80 ? "text-green-600" : finalScore >= 50 ? "text-amber-600" : "text-red-600"
  const scoreBadge = finalScore >= 80 ? "bg-green-600" : finalScore >= 50 ? "bg-amber-600" : "bg-red-600"

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Analyse SWIFT - Rapport Combiné
            </CardTitle>
            <CardDescription>
              Double validation OCR + Agent + AML
            </CardDescription>
          </div>
          <Button onClick={loadAnalysis} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-analyser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Final */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Score Final</span>
            <Badge className={scoreBadge}>
              {finalScore}%
            </Badge>
          </div>
          <Progress value={finalScore} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {report.combined.summary}
          </p>
          <Alert className={finalScore >= 80 ? "border-green-600 bg-green-600/5" : finalScore >= 50 ? "border-amber-600 bg-amber-600/5" : "border-red-600 bg-red-600/5"}>
            <AlertDescription className={scoreColor}>
              <strong>Recommandation:</strong> {report.combined.recommendation}
            </AlertDescription>
          </Alert>
        </div>

        {/* Scores Comparatifs */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Score OCR</p>
                <p className="text-2xl font-bold">{report.ocr.score}%</p>
                <Progress value={report.ocr.score} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {report.ocr.valid ? "Valide" : `${report.ocr.errors.length} erreur(s)`}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Score Agent</p>
                <p className="text-2xl font-bold">{report.agent.score}%</p>
                <Progress value={report.agent.score} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Confiance: {report.agent.confidence}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Score AML</p>
                <p className="text-2xl font-bold">{report.aml.score}%</p>
                <Progress value={report.aml.score} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Risque: {report.aml.riskLevel}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rapport OCR */}
        <Accordion type="single" collapsible>
          <AccordionItem value="ocr">
            <AccordionTrigger>Rapport OCR</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Statut:</span>
                <Badge variant={report.ocr.valid ? "default" : "destructive"}>
                  {report.ocr.valid ? "Valide" : "Invalide"}
                </Badge>
              </div>
              {report.ocr.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Erreurs détectées:</p>
                    <ul className="list-disc list-inside text-xs">
                      {report.ocr.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <div className="text-xs space-y-1">
                <p className="font-medium">Champs extraits:</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(report.ocr.extractedFields, null, 2)}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Rapport Agent */}
          <AccordionItem value="agent">
            <AccordionTrigger>Rapport Agent de Validation</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Confiance:</span>
                <Badge variant={report.agent.confidence === "high" ? "default" : report.agent.confidence === "medium" ? "secondary" : "destructive"}>
                  {report.agent.confidence.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Trouvailles:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {report.agent.findings.map((finding, i) => (
                    <li key={i}>{finding}</li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Rapport AML */}
          <AccordionItem value="aml">
            <AccordionTrigger>Rapport AML (Anti-Money Laundering)</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Niveau de risque:</span>
                <Badge variant={report.aml.riskLevel === "low" ? "default" : report.aml.riskLevel === "medium" ? "secondary" : "destructive"}>
                  {report.aml.riskLevel.toUpperCase()}
                </Badge>
              </div>
              {report.aml.flags.length > 0 && (
                <Alert variant={report.aml.riskLevel === "high" ? "destructive" : "default"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Flags détectés:</p>
                    <ul className="list-disc list-inside text-xs">
                      {report.aml.flags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              {report.aml.flags.length === 0 && (
                <Alert className="border-green-600 bg-green-600/5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Aucun flag AML détecté. Transaction conforme.
                  </AlertDescription>
                </Alert>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}






