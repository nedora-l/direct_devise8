"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PMERegisterVerificationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [registrationData, setRegistrationData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState("")
  const [channel, setChannel] = useState<"email" | "sms" | "whatsapp">("email")
  const [phone, setPhone] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [devCode, setDevCode] = useState<string>("")

  useEffect(() => {
    const data = sessionStorage.getItem("pme_registration")
    if (!data) {
      router.push("/register/pme")
      return
    }
    setRegistrationData(JSON.parse(data))
  }, [router])

  const handleSendCode = async () => {
    if (!registrationData) return

    setSendingCode(true)
    try {
      const response = await fetch("/api/register/pme/verification/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: registrationData.companyId,
          email: registrationData.email,
          phone: channel !== "email" ? phone : undefined,
          channel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // In dev mode, show the code if available
        if (errorData.devCode) {
          toast({
            title: "Code de test (mode développement)",
            description: `Code: ${errorData.devCode}`,
            duration: 10000,
          })
        }
        throw new Error(errorData.error || "Erreur lors de l'envoi du code")
      }

      const result = await response.json()
      console.log("[verification] Response from send-code:", result)
      setCodeSent(true)
      
      // Store dev code for display
      if (result.devCode) {
        setDevCode(result.devCode)
        console.log("[verification] ========================================")
        console.log("[verification] CODE DE VÉRIFICATION:", result.devCode)
        console.log("[verification] ========================================")
      } else {
        console.warn("[verification] No devCode in response. Response:", result)
      }
      
      // In development, show code in toast for testing
      if (result.devCode) {
        toast({
          title: "Code envoyé (mode développement)",
          description: `Code de test: ${result.devCode}`,
          duration: 30000,
        })
      } else {
        toast({
          title: "Code envoyé",
          description: `Un code de vérification a été envoyé par ${channel === "email" ? "email" : channel === "sms" ? "SMS" : "WhatsApp"}`,
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'envoi du code",
        variant: "destructive",
      })
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      toast({
        title: "Code invalide",
        description: "Veuillez entrer un code à 6 chiffres",
        variant: "destructive",
      })
      return
    }

    if (!registrationData?.companyId) {
      toast({
        title: "Erreur",
        description: "Données de registration manquantes. Veuillez recommencer.",
        variant: "destructive",
      })
      return
    }

    setVerifying(true)
    try {
      const payload = {
        companyId: registrationData.companyId,
        code: code.trim(),
      }
      
      console.log("[verify-code] Sending request:", payload)
      
      const response = await fetch("/api/register/pme/verification/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      console.log("[verify-code] Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[verify-code] Error response:", errorData)
        
        let errorMessage = errorData.error || "Code invalide"
        let errorDetails = errorMessage
        
        if (errorData.expired) {
          errorDetails = "Le code a expiré. Cliquez sur 'Renvoyer le code' pour en recevoir un nouveau."
        } else if (errorData.alreadyVerified) {
          errorDetails = "Ce code a déjà été utilisé."
        } else if (errorData.recentCodes && errorData.recentCodes.length > 0) {
          // In dev mode, show recent codes to help debug
          const recentCodesList = errorData.recentCodes.map((c: any) => c.code).join(", ")
          errorDetails = `${errorMessage}\n\nCodes récents pour cette entreprise: ${recentCodesList}`
          console.log("[verify-code] Recent codes for this company:", recentCodesList)
        }
        
        throw new Error(errorDetails)
      }

      const result = await response.json()
      
      if (result.verified || result.success) {
        setVerified(true)
        toast({
          title: "Vérification réussie",
          description: result.message || "Votre compte a été vérifié. Redirection...",
        })

        // Redirect to contracts (user will sign contracts, then can use platform)
        setTimeout(() => {
          router.push("/register/pme/contracts")
        }, 1500)
      } else {
        throw new Error("Erreur lors de la vérification")
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Code invalide ou expiré",
        variant: "destructive",
      })
      setCode("")
    } finally {
      setVerifying(false)
    }
  }

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-background text-foreground">
        <AnimatedBackground />
        <Card className="border-2 shadow-lg max-w-md relative z-10">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
              <h2 className="text-2xl font-bold">Compte vérifié !</h2>
              <p className="text-muted-foreground">Redirection en cours...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-background text-foreground">
      <AnimatedBackground />
      
      <div className="w-full max-w-md relative z-10">
        <Link href="/register/pme/documents" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Vérification du compte</CardTitle>
            <CardDescription>
              Étape 3/4 : Confirmez votre compte avec le code de vérification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!codeSent ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nous allons vous envoyer un code de vérification pour confirmer votre compte.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Méthode de vérification</Label>
                    <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email ({registrationData.email})
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            SMS
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(channel === "sms" || channel === "whatsapp") && (
                    <div className="space-y-2">
                      <Label>Numéro de téléphone</Label>
                      <Input
                        type="tel"
                        placeholder="+212 6XX XXX XXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSendCode}
                    disabled={sendingCode || (channel !== "email" && !phone)}
                    className="w-full"
                  >
                    {sendingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        {channel === "email" && <Mail className="mr-2 h-4 w-4" />}
                        {channel === "sms" && <Phone className="mr-2 h-4 w-4" />}
                        {channel === "whatsapp" && <MessageSquare className="mr-2 h-4 w-4" />}
                        Envoyer le code
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert className="border-accent bg-accent/5">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <AlertDescription className="text-accent">
                    Code envoyé par {channel === "email" ? "email" : channel === "sms" ? "SMS" : "WhatsApp"}
                  </AlertDescription>
                </Alert>

                {/* Display code in dev mode */}
                {devCode && (
                  <Alert className="border-yellow-500 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Mode développement - Code de test:</p>
                        <div className="font-mono text-2xl font-bold text-center py-3 bg-yellow-100 dark:bg-yellow-900/30 rounded border-2 border-yellow-400">
                          {devCode}
                        </div>
                        <p className="text-xs mt-1 text-center">Vérifiez aussi la console du navigateur</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Code de vérification (6 chiffres)</Label>
                    <Input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      className="text-center text-2xl tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Entrez le code reçu par {channel === "email" ? "email" : channel === "sms" ? "SMS" : "WhatsApp"}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCodeSent(false)
                        setCode("")
                      }}
                      className="flex-1"
                    >
                      Changer de méthode
                    </Button>
                    <Button
                      onClick={handleVerifyCode}
                      disabled={verifying || code.length !== 6}
                      className="flex-1"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Vérification...
                        </>
                      ) : (
                        "Vérifier"
                      )}
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={handleSendCode}
                    disabled={sendingCode}
                    className="w-full text-sm"
                  >
                    Renvoyer le code
                  </Button>
                </div>
              </>
            )}

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.push("/register/pme/documents")}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

