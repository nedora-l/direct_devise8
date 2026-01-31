"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2, AlertCircle, CheckCircle2, Upload, File, ArrowLeft, ArrowRight, X } from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { useToast } from "@/hooks/use-toast"

const REQUIRED_DOCUMENTS = [
  { type: "rc", label: "Extrait KBIS/RC", description: "Registre de Commerce à jour" },
  { type: "statuts", label: "Statuts de la société", description: "Statuts actualisés" },
  { type: "ice", label: "ICE (Identifiant Commun Entreprise)", description: "Identifiant fiscal" },
  { type: "patente", label: "Patente Professionnelle", description: "Autorisation d'exercer" },
  { type: "ubo", label: "Liste UBO", description: "Bénéficiaires effectifs" },
  { type: "identity", label: "Pièce d'identité dirigeant", description: "CIN ou Passeport" },
  { type: "activity", label: "Justificatif d'activité", description: "Justificatif d'activité" },
]

interface DocumentFile {
  type: string
  file: File
  preview?: string
}

export default function PMERegisterDocumentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [registrationData, setRegistrationData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [uploadedTypes, setUploadedTypes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const data = sessionStorage.getItem("pme_registration")
    if (!data) {
      router.push("/register/pme")
      return
    }
    const parsed = JSON.parse(data)
    setRegistrationData(parsed)
  }, [router])

  // Load existing documents when companyId is available
  useEffect(() => {
    if (registrationData?.companyId) {
      loadExistingDocuments()
    }
  }, [registrationData?.companyId])

  const loadExistingDocuments = async () => {
    if (!registrationData?.companyId) return
    try {
      const response = await fetch(`/api/register/pme/documents?companyId=${registrationData.companyId}`)
      if (response.ok) {
        const result = await response.json()
        const existingTypes = new Set(result.documents?.map((d: { type: string }) => d.type) || [])
        setUploadedTypes(existingTypes)
      }
    } catch (error) {
      console.error("[documents] Failed to load existing documents:", error)
    }
  }

  const handleFileSelect = (type: string, file: File) => {
    // Remove existing document of same type
    setDocuments(prev => prev.filter(d => d.type !== type))
    
    // Add new document
    const newDoc: DocumentFile = { type, file }
    setDocuments(prev => [...prev, newDoc])
  }

  const removeDocument = (type: string) => {
    setDocuments(prev => prev.filter(d => d.type !== type))
  }

  const handleBatchUpload = async () => {
    console.log("[documents] handleBatchUpload called", { 
      documentsCount: documents.length,
      companyId: registrationData?.companyId 
    })

    if (documents.length === 0) {
      console.warn("[documents] No documents to upload")
      toast({
        title: "Aucun document",
        description: "Veuillez sélectionner au moins un document à uploader",
        variant: "destructive",
      })
      return
    }

    if (!registrationData?.companyId) {
      console.error("[documents] Missing companyId in registrationData", registrationData)
      toast({
        title: "Erreur",
        description: "Données de registration manquantes. Veuillez recommencer.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      console.log("[documents] Starting batch upload of", documents.length, "documents")
      
      // Convert all files to base64
      console.log("[documents] Converting files to base64...")
      const documentsData = await Promise.all(
        documents.map(async (doc, index) => {
          console.log(`[documents] Converting file ${index + 1}/${documents.length}:`, doc.file.name, "type:", doc.type)
          const reader = new FileReader()
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string
              const base64Data = result.split(",")[1]
              console.log(`[documents] File ${index + 1} converted, size:`, base64Data.length, "chars")
              resolve(base64Data)
            }
            reader.onerror = (error) => {
              console.error(`[documents] Error reading file ${index + 1}:`, error)
              reject(error)
            }
            reader.readAsDataURL(doc.file)
          })

          return {
            type: doc.type,
            fileName: doc.file.name,
            mimeType: doc.file.type,
            contentBase64: base64,
          }
        })
      )

      console.log("[documents] All files converted. Sending request to API...")
      console.log("[documents] Request payload:", {
        companyId: registrationData.companyId,
        documentsCount: documentsData.length,
        documentTypes: documentsData.map(d => d.type)
      })

      const response = await fetch("/api/register/pme/documents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: registrationData.companyId,
          documents: documentsData,
        }),
      })

      console.log("[documents] Response status:", response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[documents] API Error:", errorData)
        throw new Error(errorData.error || `Erreur HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("[documents] Upload successful:", result)

      toast({
        title: "Documents uploadés",
        description: `${documents.length} document(s) enregistré(s) avec succès`,
      })

      // Clear selected documents
      setDocuments([])
      // Reload existing documents from DB
      console.log("[documents] Reloading existing documents from DB...")
      await loadExistingDocuments()
      console.log("[documents] Documents reloaded successfully")
    } catch (error) {
      console.error("[documents] Upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'upload des documents"
      console.error("[documents] Error message:", errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      console.log("[documents] Upload process finished")
    }
  }

  // Exclure les documents SWIFT du calcul de complétude (ils sont gérés séparément)
  const nonSwiftTypes = new Set([...uploadedTypes, ...documents.map(d => d.type)].filter(t => t !== "swift" && t !== "swift_document"))
  const completeness = Math.round((nonSwiftTypes.size / REQUIRED_DOCUMENTS.length) * 100)
  const canContinue = nonSwiftTypes.size >= 3 // Minimum 50% (3/6)

  const handleContinue = () => {
    if (!canContinue) {
      toast({
        title: "Documents manquants",
        description: "Veuillez uploader au moins 3 documents requis",
        variant: "destructive",
      })
      return
    }
    router.push("/register/pme/verification")
  }

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-background text-foreground">
      <AnimatedBackground />
      
      <div className="w-full max-w-4xl relative z-10">
        <Link href="/register/pme" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Documents requis</CardTitle>
            <CardDescription>
              Étape 2/4 : Upload des documents IGOC 2024 (minimum 3 documents)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Complétude du dossier</span>
                <span className="text-sm font-bold text-primary">{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Minimum 50% requis (3 documents sur 6)
              </p>
            </div>

            {!canContinue && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Veuillez uploader au moins 3 documents pour continuer
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REQUIRED_DOCUMENTS.map((doc) => {
                const isUploaded = uploadedTypes.has(doc.type)
                const isSelected = documents.some(d => d.type === doc.type)
                const selectedDoc = documents.find(d => d.type === doc.type)

                return (
                  <Card key={doc.type} className={isUploaded || isSelected ? "border-accent" : ""}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <File className="h-4 w-4 text-muted-foreground" />
                            <Label className="font-medium">{doc.label}</Label>
                            {(isUploaded || isSelected) && <CheckCircle2 className="h-4 w-4 text-accent" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{doc.description}</p>
                        </div>
                        {isUploaded && (
                          <Badge variant="outline" className="bg-accent/10">
                            Uploadé
                          </Badge>
                        )}
                      </div>
                      
                      {isSelected && !isUploaded && (
                        <div className="mt-3 p-2 bg-muted rounded-md flex items-center justify-between">
                          <span className="text-xs truncate flex-1 mr-2">{selectedDoc?.file.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDocument(doc.type)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {!isUploaded && !isSelected && (
                        <div className="mt-3">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileSelect(doc.type, file)
                              }
                            }}
                            className="text-xs"
                            id={`file-${doc.type}`}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {documents.length > 0 && (
              <Card className="border-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {documents.length} document(s) sélectionné(s) prêt(s) à être uploadé(s)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cliquez sur "Confirmer et uploader" pour enregistrer tous les documents
                      </p>
                    </div>
                    <Button
                      onClick={handleBatchUpload}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Upload...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Confirmer et uploader
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/register/pme")}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!canContinue || loading}
                className="flex-1"
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
