"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { kycManager } from "@/lib/kyc-manager"
import type { KYCProfile } from "@/lib/types"

interface KYCStatusProps {
  kycId: string
}

export default function KYCStatus({ kycId }: KYCStatusProps) {
  const [profile, setProfile] = useState<KYCProfile | null>(null)

  useEffect(() => {
    const kyc = kycManager.getProfile(kycId)
    if (kyc) {
      setProfile(kyc)
    }
  }, [kycId])

  if (!profile) {
    return <p className="text-muted-foreground">Chargement...</p>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-accent text-accent-foreground"
      case "rejected":
        return "bg-destructive text-destructive-foreground"
      case "pending":
        return "bg-amber-100 text-amber-900"
      default:
        return "bg-slate-100 text-slate-900"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Approuvé"
      case "rejected":
        return "Rejeté"
      case "pending":
        return "En attente"
      case "suspended":
        return "Suspendu"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Statut de Conformité</CardTitle>
          <CardDescription>État actuel de votre profil KYC</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Statut Général</p>
              <Badge className={getStatusColor(profile.complianceStatus)}>
                {getStatusLabel(profile.complianceStatus)}
              </Badge>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Statut AML</p>
              <Badge
                variant={
                  profile.amlStatus === "red"
                    ? "destructive"
                    : profile.amlStatus === "amber"
                      ? "outline"
                      : "default"
                }
              >
                {profile.amlStatus === "red"
                  ? "Risque Élevé"
                  : profile.amlStatus === "amber"
                    ? "Risque Moyen"
                    : "Faible Risque"}
              </Badge>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Score Risque AML</p>
              <p className="text-2xl font-bold text-primary">{profile.amlRiskScore}/100</p>
            </div>
          </div>

          {profile.lastReviewDate && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Dernière révision: {new Date(profile.lastReviewDate).toLocaleDateString("fr-FR")}
              </AlertDescription>
            </Alert>
          )}

          {profile.expiryDate && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Valide jusqu'au: {new Date(profile.expiryDate).toLocaleDateString("fr-FR")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Nom légal</p>
            <p className="font-medium">{profile.legalName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Numéro RC</p>
            <p className="font-medium">{profile.registrationNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Secteur</p>
            <p className="font-medium">{profile.businessSector || "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ville d'opération</p>
            <p className="font-medium">{profile.operationalCity}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents Soumis</CardTitle>
          <CardDescription>{profile.documents.length} document(s) téléchargé(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {profile.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document</p>
          ) : (
            <div className="space-y-2">
              {profile.documents.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">{doc.fileName}</span>
                  <Badge
                    variant={doc.status === "verified" ? "default" : doc.status === "rejected" ? "destructive" : "outline"}
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
