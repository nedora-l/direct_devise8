"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExtractedSwiftData {
  amount: string
  currency: string
  date?: string
  reference: string
  beneficiary?: string
  iban?: string
  bankCode?: string
  rawContent?: string
}

export default function SwiftUpload() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedSwiftData | null>(null)
  const [loading, setLoading] = useState(false)
  const [agentAnalysis, setAgentAnalysis] = useState<{ riskLevel?: string; anomalies?: string[] } | null>(null)
  const [error, setError] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setExtractedData(null)
      setAgentAnalysis(null)
      setError("")
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    setLoading(true)
    setError("")
    
    try {
      // Convert file to base64
      const reader = new FileReader()
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Step 1: Parse SWIFT with real API
      const parseResponse = await fetch("/api/swift/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          fileBase64,
          mimeType: file.type || "application/pdf",
          fileName: file.name || "swift.pdf",
        }),
      })

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json().catch(() => ({}))
        throw new Error(errorData.error || "Erreur lors de l'extraction SWIFT")
      }

      const parseResult = await parseResponse.json()
      console.log("[swift-upload] Parse result:", {
        hasData: !!parseResult.data,
        valid: parseResult.valid,
        errorCount: parseResult.errors?.length || 0,
        errors: parseResult.errors?.slice(0, 3),
      })
      
      // Si pas de données extraites, permettre saisie manuelle
      if (!parseResult.data) {
        const errorMessages = parseResult.errors || ["Aucune donnée extraite du document"]
        console.warn("[swift-upload] No data extracted, allowing manual entry:", errorMessages)
        
        // Créer des données vides pour permettre la saisie manuelle
        const swiftData: ExtractedSwiftData = {
          amount: "",
          currency: "EUR",
          date: new Date().toISOString().split("T")[0],
          reference: `SWIFT-${Date.now()}`,
          beneficiary: "",
          iban: "",
          bankCode: "",
          rawContent: parseResult.rawContent || parseResult.content || "",
        }
        setExtractedData(swiftData)
        
        // Afficher un avertissement mais permettre de continuer
        toast({
          title: "Extraction automatique échouée",
          description: errorMessages.join(". ") + " Veuillez saisir les informations manuellement.",
          variant: "default",
        })
        return // Continue avec saisie manuelle
      }

      // Si données extraites mais invalides, afficher les erreurs mais permettre de continuer
      if (!parseResult.valid && parseResult.errors && parseResult.errors.length > 0) {
        console.warn("[swift-upload] Data extracted but validation errors:", parseResult.errors)
        toast({
          title: "Données extraites avec des erreurs",
          description: `${parseResult.errors.length} erreur(s) détectée(s). Vérifiez et corrigez les champs si nécessaire.`,
          variant: "default",
        })
      }

      const swiftData: ExtractedSwiftData = {
        amount: String(parseResult.data.amount || ""),
        currency: String(parseResult.data.currency || "").toUpperCase(),
        date: parseResult.data.date || new Date().toISOString().split("T")[0],
        reference: String(parseResult.data.reference || `SWIFT-${Date.now()}`),
        beneficiary: String(parseResult.data.beneficiaryName || ""),
        iban: String(parseResult.data.beneficiaryIban || ""),
        bankCode: String(parseResult.data.beneficiaryBic || ""),
        rawContent: parseResult.rawContent || parseResult.content || "", // Store raw SWIFT text
      }
      setExtractedData(swiftData)
      
      // Note: L'analyse complète (OCR, Agent, AML) sera faite par l'admin après sauvegarde
      // via /api/swift/analyze avec le swiftId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'analyse"
      setError(errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    if (!extractedData || !file) return

    setLoading(true)
    setError("")

    try {
      // Step 1: Convert file to base64 for document storage
      const reader = new FileReader()
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Step 2: Save document source first
      console.log("[swift-upload] Saving document source...")
      const docResponse = await fetch("/api/data/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "swift_document",
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          contentBase64: fileBase64, // Use contentBase64 (API will use session to get companyId)
        }),
      })

      let sourceDocumentId: string | null = null
      if (docResponse.ok) {
        const docResult = await docResponse.json()
        sourceDocumentId = docResult.document?.id || null
        console.log("[swift-upload] Document source saved:", sourceDocumentId)
      } else {
        const docError = await docResponse.json().catch(() => ({}))
        console.error("[swift-upload] Failed to save document source:", docError)
        // Continue anyway - SWIFT can be saved without document source
      }

      // Step 3: Save SWIFT to database with source document reference
      console.log("[swift-upload] Saving SWIFT to database...")
      const swiftPayload = {
        reference: extractedData.reference,
        amount: Number(extractedData.amount),
        currency: extractedData.currency,
        parsedJson: {
          ...extractedData,
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          sourceDocument: sourceDocumentId, // Link to document for OCR
          sourceFileName: file.name,
          rawContent: extractedData.rawContent || "", // Store raw SWIFT text if available
        },
        validated: false, // Will be validated by admin
      }
      console.log("[swift-upload] SWIFT payload:", { ...swiftPayload, parsedJson: { ...swiftPayload.parsedJson, rawContent: "[...]" } })
      
      const response = await fetch("/api/data/swifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swiftPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[swift-upload] SWIFT save failed:", errorData)
        throw new Error(errorData.error || "Erreur lors de l'enregistrement du SWIFT")
      }
      
      const swiftResult = await response.json()
      console.log("[swift-upload] SWIFT saved successfully:", swiftResult.swift?.id)

      toast({
        title: "SWIFT soumis avec succès",
        description: "Votre document a été transmis et sera validé par notre équipe sous 24-48h.",
      })

      // Redirect to validations page
      router.push('/pme/validations')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la validation"
      setError(errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isEligible = extractedData && Number(extractedData.amount) < 10000

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
        <Label htmlFor="swift-file" className="cursor-pointer">
          <div className="space-y-2">
            <p className="text-sm font-medium">Glissez-déposez votre fichier SWIFT MT103/MT202</p>
            <p className="text-xs text-muted-foreground">ou cliquez pour sélectionner (PDF, TXT)</p>
            <Input 
              id="swift-file"
              type="file" 
              accept=".pdf,.txt" 
              onChange={handleFileChange} 
              className="hidden" 
              disabled={loading}
            />
          </div>
        </Label>
      </div>

      {file && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm mb-4">
              <span className="font-medium">Fichier sélectionné:</span> {file.name}
            </p>
            <Button onClick={handleAnalyze} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                "Analyser le document SWIFT"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {extractedData && (
        <Card className={isEligible ? "border-accent" : "border-destructive"}>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Montant</p>
                <p className="font-bold">{extractedData.currency} {extractedData.amount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-bold">{extractedData.date || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Référence</p>
                <p className="text-sm font-mono">{extractedData.reference}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bénéficiaire</p>
                <p className="text-sm">{extractedData.beneficiary || "N/A"}</p>
              </div>
            </div>

            {agentAnalysis && (
              <div className="p-3 bg-muted rounded">
                <p className="text-xs font-medium mb-2">Analyse Agent LLM</p>
                <div className="space-y-1 text-xs">
                  {agentAnalysis.riskLevel && (
                    <p>Risque détecté: <span className="font-medium">{agentAnalysis.riskLevel}</span></p>
                  )}
                  {agentAnalysis.anomalies && agentAnalysis.anomalies.length > 0 && (
                    <div>
                      <p className="font-medium">Anomalies:</p>
                      <ul className="list-disc list-inside">
                        {agentAnalysis.anomalies.map((a: string, i: number) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`p-3 rounded-md text-sm ${isEligible ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
              {isEligible ? "Montant eligible pour traitement automatique" : "Montant > 10 000€ - Nécessite enchères inversées"}
            </div>

            <Button 
              className="w-full" 
              disabled={loading || !extractedData}
              onClick={handleValidate}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Soumission en cours...
                </>
              ) : (
                "Soumettre pour validation"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
