"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from 'lucide-react'
import { auctionManager } from "@/lib/auction-manager"

interface AuctionCreatorProps {
  adminId: string
}

export default function AuctionCreator({ adminId }: AuctionCreatorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "MAD",
    exchangeCurrency: "EUR",
    minRate: "",
    maxRate: "",
    durationHours: "24",
  })

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
    setSuccess(false)

    try {
      if (!formData.description.trim()) throw new Error("Description requise")
      if (!formData.amount || isNaN(Number(formData.amount))) throw new Error("Montant invalide")
      if (!formData.minRate || isNaN(Number(formData.minRate))) throw new Error("Taux minimum invalide")
      if (!formData.maxRate || isNaN(Number(formData.maxRate))) throw new Error("Taux maximum invalide")

      const minRate = Number(formData.minRate)
      const maxRate = Number(formData.maxRate)
      if (minRate >= maxRate) throw new Error("Taux minimum doit être inférieur au maximum")

      auctionManager.createAuction(
        adminId,
        formData.description,
        Number(formData.amount),
        formData.currency,
        formData.exchangeCurrency,
        minRate,
        maxRate,
        Number(formData.durationHours)
      )

      setSuccess(true)
      setFormData({
        description: "",
        amount: "",
        currency: "MAD",
        exchangeCurrency: "EUR",
        minRate: "",
        maxRate: "",
        durationHours: "24",
      })

      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer une Nouvelle Enchère Inversée</CardTitle>
        <CardDescription>Lancez un appel d'offres auprès des banques partenaires</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-destructive bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-accent bg-accent/5">
              <AlertCircle className="h-4 w-4 text-accent" />
              <AlertDescription className="text-accent">Enchère créée avec succès</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description de l'opération *</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Change EUR/MAD pour importation de matériel électronique"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Ex: 50000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Devise locale *</Label>
              <Select value={formData.currency} onValueChange={(v) => handleSelectChange("currency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAD">Dirham (MAD)</SelectItem>
                  <SelectItem value="USD">Dollar (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchangeCurrency">Devise d'échange *</Label>
              <Select value={formData.exchangeCurrency} onValueChange={(v) => handleSelectChange("exchangeCurrency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dollar (USD)</SelectItem>
                  <SelectItem value="GBP">Livre (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationHours">Durée (heures)</Label>
              <Select value={formData.durationHours} onValueChange={(v) => handleSelectChange("durationHours", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 heures</SelectItem>
                  <SelectItem value="48">48 heures</SelectItem>
                  <SelectItem value="72">72 heures</SelectItem>
                  <SelectItem value="168">1 semaine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRate">Taux minimum *</Label>
              <Input
                id="minRate"
                name="minRate"
                type="number"
                step="0.001"
                value={formData.minRate}
                onChange={handleChange}
                placeholder="Ex: 10.50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRate">Taux maximum *</Label>
              <Input
                id="maxRate"
                name="maxRate"
                type="number"
                step="0.001"
                value={formData.maxRate}
                onChange={handleChange}
                placeholder="Ex: 11.50"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Création en cours..." : "Créer l'enchère"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
