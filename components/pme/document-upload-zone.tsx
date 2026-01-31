'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, AlertCircle } from 'lucide-react'

interface DocumentUploadZoneProps {
  requiredDocs: Array<{ type: string; label: string; description: string }>
  onDocumentAdded: (doc: any) => void
}

export default function DocumentUploadZone({ requiredDocs, onDocumentAdded }: DocumentUploadZoneProps) {
  const [selectedType, setSelectedType] = useState(requiredDocs[0]?.type || "")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      if (f.size > 10 * 1024 * 1024) { // 10MB max
        setError("Fichier trop volumineux (max 10MB)")
        return
      }
      setFile(f)
      setError("")
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedType) {
      setError("Sélectionnez un type et un fichier")
      return
    }

    setUploading(true)
    try {
      const ab = await file.arrayBuffer()
      const u8 = new Uint8Array(ab)
      let s = ""
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
      const base64 = (typeof window !== 'undefined' && window.btoa) ? window.btoa(s) : Buffer.from(s, 'binary').toString('base64')
      const newDoc = {
        id: `${Date.now()}_${Math.random()}`,
        type: selectedType,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        status: "pending",
        summary: `Document: ${file.name}, Type: ${selectedType}`,
        base64
      }
      
      onDocumentAdded(newDoc)
      setFile(null)
      setSelectedType(requiredDocs[0]?.type || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload")
    } finally {
      setUploading(false)
    }
  }

  const selectedDocLabel = requiredDocs.find(d => d.type === selectedType)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Télécharger un Document</CardTitle>
        <CardDescription>
          {selectedDocLabel?.description}
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
          <Label>Type de Document *</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {requiredDocs.map(doc => (
                <SelectItem key={doc.type} value={doc.type}>
                  {doc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fichier (PDF, JPG, PNG) *</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">{file?.name || "Glissez-déposez votre fichier"}</p>
              <p className="text-xs text-muted-foreground">ou cliquez pour sélectionner</p>
            </Label>
          </div>
        </div>

        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? "Téléchargement..." : "Télécharger"}
        </Button>
      </CardContent>
    </Card>
  )
}
