"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Upload, File, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import type { KYCDocument } from "@/lib/types"

interface DocumentUploaderProps {
  kycId: string
  userId: string
}

export default function DocumentUploader({ kycId, userId }: DocumentUploaderProps) {
  const [documentType, setDocumentType] = useState<KYCDocument["documentType"]>("rc")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<KYCDocument[]>([])
  const [error, setError] = useState("")

  const requiredDocuments = [
    { type: "rc", label: "Registre de Commerce (RC)" },
    { type: "ice", label: "Identifiant Commun d'Entreprise (ICE)" },
    { type: "patente", label: "Patente Professionnelle" },
    { type: "identity", label: "Pièce d'Identité du Responsable" },
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Sélectionnez un fichier")
      return
    }

    setLoading(true)
    setError("")

    try {
      const ab = await file.arrayBuffer()
      const u8 = new Uint8Array(ab)
      let s = ""
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
      const base64 = (typeof window !== 'undefined' && window.btoa) ? window.btoa(s) : Buffer.from(s, 'binary').toString('base64')

      const res = await fetch('/api/data/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: kycId,
          type: documentType,
          fileName: file.name,
          mimeType: file.type,
          base64,
        })
      })
      if (!res.ok) throw new Error('Échec de l\'enregistrement du document')
      const json = await res.json()
      const doc = json.document as KYCDocument
      setDocuments((prev) => [...prev, doc])
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="h-4 w-4 text-accent" />
      case "rejected":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-accent">Vérifié</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>
      case "pending":
        return <Badge variant="outline">En attente</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Télécharger des Documents</CardTitle>
          <CardDescription>
            Téléchargez les documents requis pour la vérification KYC (format PDF, JPG, PNG)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-destructive bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="docType">Type de document *</Label>
            <Select value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {requiredDocuments.map((doc) => (
                  <SelectItem key={doc.type} value={doc.type}>
                    {doc.label}
                  </SelectItem>
                ))}
                <SelectItem value="ubo">Déclaration UBO</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Fichier *</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <Label htmlFor="file" className="cursor-pointer">
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">{file?.name || "Glissez-déposez votre fichier"}</p>
                  <p className="text-xs text-muted-foreground">ou cliquez pour sélectionner</p>
                </div>
              </Label>
            </div>
          </div>

          <Button onClick={handleUpload} disabled={loading || !file} className="w-full">
            {loading ? "Téléchargement..." : "Télécharger le document"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents Soumis</CardTitle>
          <CardDescription>Liste des documents que vous avez téléchargés</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document téléchargé pour le moment</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(doc.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Téléchargé le {new Date(doc.uploadDate).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
