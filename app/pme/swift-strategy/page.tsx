"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import PMENav from "@/components/pme/pme-nav"
import { Zap, TrendingUp, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

function SwiftStrategyPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const swiftId = searchParams.get("swiftId")
  const [swift, setSwift] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [strategy, setStrategy] = useState<"auction" | "spotting">("auction")
  const [targetRate, setTargetRate] = useState("")
  const [targetCurrency, setTargetCurrency] = useState("")
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [rateSource, setRateSource] = useState<"bkam" | "mock" | null>(null)
  const [splitMode, setSplitMode] = useState<"IGOC_30" | "FULL_100">("IGOC_30")

  useEffect(() => {
    if (!swiftId) {
      router.push("/pme/validations")
      return
    }

    // Fetch user data
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(sessionData => {
        if (sessionData?.user) {
          setUser(sessionData.user)
        }
      })
      .catch(() => {})

    // Fetch SWIFT details
    fetch(`/api/data/swifts?id=${swiftId}`)
      .then(res => res.json())
      .then(data => {
        if (data.swift) {
          setSwift(data.swift)
          const parsed = data.swift.parsedJson as any
          setTargetCurrency(`${data.swift.currency}/MAD`)
          // Load existing strategy if set
          if (data.swift.rateStrategy) {
            setStrategy(data.swift.rateStrategy as "auction" | "spotting")
          }
          if (data.swift.targetRate) {
            setTargetRate(String(data.swift.targetRate))
          }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Error loading SWIFT:", err)
        setLoading(false)
      })
  }, [swiftId, router])

  // Fetch current exchange rate
  useEffect(() => {
    if (swift && swift.currency && strategy === "spotting" && targetCurrency) {
      // Extract base currency from pair (e.g., "EUR/MAD" -> "EUR")
      const baseCurrency = targetCurrency.split('/')[0]
      const pair = `${baseCurrency}/MAD`
      
      fetch(`/api/bkam/rates`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(data => {
          // Extract rate from response
          const rate = data.data?.[pair] || data.data?.[pair.toUpperCase()]
          if (rate && typeof rate === 'number') {
            setCurrentRate(rate)
            setRateSource(data.source || "mock")
          } else {
            console.warn(`Rate not found for ${pair}`, data)
            setCurrentRate(null)
            setRateSource(null)
          }
        })
        .catch((err) => {
          console.error("Error fetching rate:", err)
          setCurrentRate(null)
        })
    }
  }, [swift, strategy, targetCurrency])

  const handleSubmit = async () => {
    if (!swiftId) return

    if (strategy === "spotting" && (!targetRate || !targetCurrency)) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner le taux cible et la paire de devises",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/swift/set-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swiftId,
          strategy,
          targetRate: strategy === "spotting" ? parseFloat(targetRate) : null,
          targetCurrency: strategy === "spotting" ? targetCurrency : null,
          splitMode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la configuration")
      }

      toast({
        title: "Stratégie configurée",
        description: strategy === "spotting" 
          ? "Votre SWIFT sera automatiquement validé lorsque le taux cible sera atteint"
          : "Votre SWIFT est prêt pour les enchères",
      })

      // Attendre un peu pour que le toast s'affiche, puis rediriger
      setTimeout(() => {
        router.push("/pme/validations")
        router.refresh() // Forcer le rafraîchissement des données
      }, 500)
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Erreur lors de la configuration",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {user && <PMENav user={{ name: user.name || "", email: user.email, companyName: user.company?.name || "", role: "pme" }} />}
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">Chargement...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!swift) {
    return (
      <div className="min-h-screen bg-background">
        {user && <PMENav user={{ name: user.name || "", email: user.email, companyName: user.company?.name || "", role: "pme" }} />}
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>SWIFT non trouvé</AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/pme/validations")} className="mt-4">
            Retour
          </Button>
        </main>
      </div>
    )
  }

  const expiresAt = swift.expiresAt ? new Date(swift.expiresAt) : null
  const daysRemaining = expiresAt 
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-background">
      {user && <PMENav user={{ name: user.name || "", email: user.email, companyName: user.company?.name || "", role: "pme" }} />}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Choisir la stratégie pour votre SWIFT</h1>
          <p className="text-muted-foreground">Référence: {swift.reference}</p>
        </div>

        {/* SWIFT Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Détails du SWIFT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className="text-lg font-bold">{fmt(Number(swift.amount || 0))} {String(swift.currency || "").toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date validation</p>
                <p className="text-sm">{swift.validatedAt ? new Date(swift.validatedAt).toLocaleDateString("fr-FR") : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiration</p>
                <p className="text-sm">
                  {expiresAt ? expiresAt.toLocaleDateString("fr-FR") : "Non définie"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temps restant</p>
                <Badge className={daysRemaining && daysRemaining < 7 ? "bg-red-600" : "bg-green-600"}>
                  {daysRemaining !== null ? `${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}` : "N/A"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Stratégie de conversion</CardTitle>
            <CardDescription>
              Choisissez comment vous souhaitez utiliser ce SWIFT pour la conversion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as "auction" | "spotting")}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="auction" id="auction" className="mt-1" />
                <Label htmlFor="auction" className="flex-1 cursor-pointer">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold">Enchère directe</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Mettez votre SWIFT en enchère immédiatement. Les banques proposeront leurs meilleurs taux.
                      </p>
                      {strategy === "auction" && (
                        <div className="mt-3 p-3 bg-muted/50 rounded">
                          <Label className="mb-2 block">Répartition du montant</Label>
                          <RadioGroup value={splitMode} onValueChange={(v) => setSplitMode(v as "IGOC_30" | "FULL_100")} className="grid grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <RadioGroupItem value="IGOC_30" id="igoc30-auction" />
                              <Label htmlFor="igoc30-auction" className="cursor-pointer flex-1">
                                <div>
                                  <p className="font-medium">IGOC 30%</p>
                                  <p className="text-xs text-muted-foreground">
                                    {swift && `Montant: ${fmt((swift.amount || 0) * 0.3)} ${swift.currency}`}
                                  </p>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <RadioGroupItem value="FULL_100" id="full100-auction" />
                              <Label htmlFor="full100-auction" className="cursor-pointer flex-1">
                                <div>
                                  <p className="font-medium">Conversion 100%</p>
                                  <p className="text-xs text-muted-foreground">
                                    {swift && `Montant: ${fmt(swift.amount || 0)} ${swift.currency}`}
                                  </p>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="spotting" id="spotting" className="mt-1" />
                <Label htmlFor="spotting" className="flex-1 cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Spotting des taux</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Attendez que le taux atteigne votre objectif. Le SWIFT sera automatiquement validé pour enchère.
                    </p>
                    {strategy === "spotting" && (
                      <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded">
                        <div>
                          <Label htmlFor="targetCurrency">Paire de devises</Label>
                          <Input
                            id="targetCurrency"
                            value={targetCurrency}
                            onChange={(e) => setTargetCurrency(e.target.value)}
                            placeholder="EUR/MAD"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="targetRate">Taux cible</Label>
                          <Input
                            id="targetRate"
                            type="number"
                            step="0.0001"
                            value={targetRate}
                            onChange={(e) => setTargetRate(e.target.value)}
                            placeholder="10.50"
                            className="mt-1"
                          />
                          {currentRate !== null && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                              <span>Taux actuel:</span>
                              <span className="font-semibold">{fmt(currentRate)}</span>
                              <Badge variant="outline" className="text-xs">
                                {rateSource === "bkam" ? "BKAM" : "Mock"}
                              </Badge>
                              <span>|</span>
                              {parseFloat(targetRate) > currentRate ? (
                                <span className="text-green-600">Objectif au-dessus du marché</span>
                              ) : (
                                <span className="text-red-600">Objectif en dessous du marché</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="mb-2 block">Répartition du montant</Label>
                          <RadioGroup value={splitMode} onValueChange={(v) => setSplitMode(v as "IGOC_30" | "FULL_100")} className="grid grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <RadioGroupItem value="IGOC_30" id="igoc30" />
                              <Label htmlFor="igoc30" className="cursor-pointer flex-1">
                                <div>
                                  <p className="font-medium">IGOC 30%</p>
                                  <p className="text-xs text-muted-foreground">
                                    {swift && `Montant: ${fmt((swift.amount || 0) * 0.3)} ${swift.currency}`}
                                  </p>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <RadioGroupItem value="FULL_100" id="full100" />
                              <Label htmlFor="full100" className="cursor-pointer flex-1">
                                <div>
                                  <p className="font-medium">Conversion 100%</p>
                                  <p className="text-xs text-muted-foreground">
                                    {swift && `Montant: ${fmt(swift.amount || 0)} ${swift.currency}`}
                                  </p>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                ⏰ Ce SWIFT expire dans {daysRemaining !== null ? `${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}` : "30 jours"} selon la réglementation IGOC Maroc.
                {strategy === "spotting" && " Si le taux n'est pas atteint avant expiration, vous devrez re-uploader le SWIFT."}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || (strategy === "spotting" && (!targetRate || !targetCurrency))}
                className="flex-1"
                size="lg"
              >
                {submitting ? "Enregistrement..." : strategy === "spotting" ? "Activer le spotting" : "Créer l'enchère"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/pme/validations")}
                disabled={submitting}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function SwiftStrategyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="h-16" />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">Chargement...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    }>
      <SwiftStrategyPageInner />
    </Suspense>
  )
}

