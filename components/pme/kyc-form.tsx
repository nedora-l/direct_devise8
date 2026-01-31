"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from 'lucide-react'

interface KYCFormProps {
  userId: string
  companyName?: string
  onSuccess?: (kycId: string) => void
  isReadOnly?: boolean
}

export default function KYCForm({ userId, companyName = "", onSuccess, isReadOnly = false }: KYCFormProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    legalName: "",
    commercialName: companyName,
    registrationNumber: "",
    taxId: "",
    businessType: "import-export",
    businessSector: "",
    foundingDate: "",
    headOfficeAddress: "",
    operationalCity: "",
    operationalCountry: "MA",
  })

  // Load existing KYC data from API
  useEffect(() => {
    const loadKYCData = async () => {
      try {
        const response = await fetch("/api/kyc/profile")
        if (response.ok) {
          const result = await response.json()
          if (result.profile) {
            // Pre-fill with data from DB (extracted by admin or manually entered)
            setFormData({
              legalName: result.profile.legalName || "",
              commercialName: result.profile.commercialName || companyName,
              registrationNumber: result.profile.registrationNumber || "",
              taxId: result.profile.taxId || "",
              businessType: result.profile.businessType || "import-export",
              businessSector: result.profile.businessSector || "",
              foundingDate: result.profile.foundingDate || "",
              headOfficeAddress: result.profile.headOfficeAddress || "",
              operationalCity: result.profile.operationalCity || "",
              operationalCountry: result.profile.operationalCountry || "MA",
            })
          }
        }
      } catch (err) {
        // Silently fail - form will start empty
      } finally {
        setLoadingData(false)
      }
    }
    loadKYCData()
  }, [companyName])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validation
      if (!formData.legalName.trim()) {
        throw new Error("Nom légal requis")
      }
      if (!formData.registrationNumber.trim()) {
        throw new Error("Numéro RC requis")
      }
      if (!formData.taxId.trim()) {
        throw new Error("ID fiscal requis")
      }

      // Save to database via API
      const response = await fetch("/api/kyc/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileData: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Erreur lors de la sauvegarde")
      }

      const result = await response.json()
      if (result.profile) {
        if (onSuccess) {
          onSuccess(result.profile.id)
        }
      } else {
        throw new Error("Réponse invalide du serveur")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la soumission")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations Générales</CardTitle>
        <CardDescription>
          {isReadOnly 
            ? "Vos informations d'entreprise (lecture seule - approuvé par l'administrateur)"
            : "Entrez vos informations d'entreprise pour la vérification KYC"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-destructive bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {isReadOnly && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Votre profil KYC a été approuvé. Ces informations sont en lecture seule.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Nom légal de l'entreprise *</Label>
              <Input
                id="legalName"
                name="legalName"
                value={formData.legalName}
                onChange={handleChange}
                placeholder="Ex: SARL Mon Entreprise"
                required
                disabled={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commercialName">Nom commercial</Label>
              <Input
                id="commercialName"
                name="commercialName"
                value={formData.commercialName}
                onChange={handleChange}
                placeholder="Ex: Mon Entreprise"
                disabled={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Numéro RC (Registre de Commerce) *</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="Ex: 123456"
                required
                disabled={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">ID Fiscal (ICE) *</Label>
              <Input
                id="taxId"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                placeholder="Ex: 00123456789012"
                required
                disabled={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Type d'activité</Label>
              <Select 
                value={formData.businessType} 
                onValueChange={(v) => handleSelectChange("businessType", v)}
                disabled={isReadOnly}
              >
                <SelectTrigger className={isReadOnly ? "bg-muted" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="import-export">Import/Export</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="manufacturing">Fabrication</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessSector">Secteur d'activité</Label>
              <Input
                id="businessSector"
                name="businessSector"
                value={formData.businessSector}
                onChange={handleChange}
                placeholder="Ex: Électronique, Textile"
                disabled={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foundingDate">Date de création</Label>
              <Input
                id="foundingDate"
                name="foundingDate"
                type="date"
                value={formData.foundingDate}
                onChange={handleChange}
                disabled={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operationalCountry">Pays d'opération</Label>
              <Input
                id="operationalCountry"
                name="operationalCountry"
                value={formData.operationalCountry}
                onChange={handleChange}
                placeholder="MA"
                disabled={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headOfficeAddress">Adresse du siège social</Label>
            <Textarea
              id="headOfficeAddress"
              name="headOfficeAddress"
              value={formData.headOfficeAddress}
              onChange={handleChange}
              placeholder="Ex: 123 Rue Principale, Casablanca"
              rows={3}
              disabled={isReadOnly}
              className={isReadOnly ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operationalCity">Ville d'opération</Label>
            <Input
              id="operationalCity"
              name="operationalCity"
              value={formData.operationalCity}
              onChange={handleChange}
              placeholder="Ex: Casablanca"
              disabled={isReadOnly}
              className={isReadOnly ? "bg-muted" : ""}
            />
          </div>

          {!isReadOnly && (
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Soumission en cours..." : "Soumettre les informations"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
