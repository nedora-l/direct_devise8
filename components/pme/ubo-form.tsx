"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { kycManager } from "@/lib/kyc-manager"
import type { UBOInformation } from "@/lib/types"

interface UBOFormProps {
  kycId: string
  userId: string
}

export default function UBOForm({ kycId, userId }: UBOFormProps) {
  const [ubos, setUbos] = useState<UBOInformation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nationality: "MA",
    identityNumber: "",
    ownershipPercentage: "",
    role: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddUBO = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error("Nom et prénom requis")
      }
      if (!formData.ownershipPercentage || isNaN(Number(formData.ownershipPercentage))) {
        throw new Error("Pourcentage de propriété requis")
      }

      const ubo = kycManager.addUBO(kycId, {
        ...formData,
        ownershipPercentage: Number(formData.ownershipPercentage),
      })
      setUbos((prev) => [...prev, ubo])
      setFormData({
        firstName: "",
        lastName: "",
        nationality: "MA",
        identityNumber: "",
        ownershipPercentage: "",
        role: "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout")
    } finally {
      setLoading(false)
    }
  }

  const totalOwnership = ubos.reduce((sum, ubo) => sum + ubo.ownershipPercentage, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Déclaration des Bénéficiaires Finaux (UBO)</CardTitle>
          <CardDescription>
            Déclarez les personnes physiques ayant plus de 25% de propriété directe ou indirecte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-destructive bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddUBO} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ex: Ahmed"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Ex: Alaoui"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="identityNumber">Numéro CIN/Passeport</Label>
                <Input
                  id="identityNumber"
                  name="identityNumber"
                  value={formData.identityNumber}
                  onChange={handleChange}
                  placeholder="Ex: AB123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationalité</Label>
                <Input
                  id="nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownershipPercentage">Pourcentage de propriété * (%)</Label>
                <Input
                  id="ownershipPercentage"
                  name="ownershipPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.ownershipPercentage}
                  onChange={handleChange}
                  placeholder="Ex: 51"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle/Titre</Label>
                <Input
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="Ex: Directeur général"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter ce bénéficiaire
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bénéficiaires Déclarés</CardTitle>
          <CardDescription>Total de propriété: {totalOwnership}%</CardDescription>
        </CardHeader>
        <CardContent>
          {ubos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bénéficiaire déclaré pour le moment</p>
          ) : (
            <div className="space-y-3">
              {ubos.map((ubo) => (
                <div key={ubo.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {ubo.firstName} {ubo.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{ubo.nationality}</p>
                    </div>
                    <Badge>{ubo.ownershipPercentage}%</Badge>
                  </div>
                  {ubo.role && <p className="text-sm text-muted-foreground">Rôle: {ubo.role}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
