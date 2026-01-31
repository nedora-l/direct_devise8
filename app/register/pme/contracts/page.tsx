"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, ArrowRight, FileText, CheckCircle2 } from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { useToast } from "@/hooks/use-toast"

const CONTRACTS = [
  {
    id: "saas",
    title: "Contrat de Prestation de Services SaaS",
    description: "Contrat définissant les termes d'utilisation de la plateforme Direct Devise",
  },
  {
    id: "eligibility",
    title: "Déclaration d'Éligibilité aux Opérations de Change",
    description: "Conformité IGOC 2024 - Article 3.2",
  },
  {
    id: "mandate",
    title: "Mandat d'Autorisation de Change",
    description: "Autorisation pour effectuer les opérations de change en votre nom",
  },
]

export default function PMERegisterContractsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [registrationData, setRegistrationData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [signedContracts, setSignedContracts] = useState<Set<string>>(new Set())
  const [accepted, setAccepted] = useState<Record<string, boolean>>({
    saas: false,
    eligibility: false,
    mandate: false,
  })

  useEffect(() => {
    const data = sessionStorage.getItem("pme_registration")
    if (!data) {
      router.push("/register/pme")
      return
    }
    setRegistrationData(JSON.parse(data))
    loadSignedContracts()
  }, [router])

  const loadSignedContracts = async () => {
    if (!registrationData?.companyId) return
    try {
      const response = await fetch(`/api/register/pme/contracts?companyId=${registrationData.companyId}`)
      if (response.ok) {
        const result = await response.json()
        const signed = new Set(result.contracts.map((c: any) => c.type.replace("contract_", "")))
        setSignedContracts(signed)
        // Pre-check if already signed
        signed.forEach((id) => {
          setAccepted((prev) => ({ ...prev, [id]: true }))
        })
      }
    } catch (error) {
      // Silently fail
    }
  }

  const handleAccept = async (contractId: string) => {
    if (!registrationData) return

    setLoading(true)
    try {
      // Create a simple signature (in production, use a proper signature component)
      const signatureData = `signed_${contractId}_${Date.now()}`
      const signatureBase64 = btoa(signatureData)

      const response = await fetch("/api/register/pme/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: registrationData.companyId,
          contractType: contractId,
          signatureBase64,
          signedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'enregistrement")
      }

      setAccepted((prev) => ({ ...prev, [contractId]: true }))
      setSignedContracts((prev) => new Set([...prev, contractId]))
      
      toast({
        title: "Contrat signé",
        description: "Le contrat a été enregistré avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la signature du contrat",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const allAccepted = Object.values(accepted).every(Boolean)
  const canContinue = allAccepted

  const handleContinue = () => {
    if (!canContinue) {
      toast({
        title: "Contrats manquants",
        description: "Veuillez accepter tous les contrats pour continuer",
        variant: "destructive",
      })
      return
    }
    router.push("/register/pme/waiting")
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
      
      <div className="w-full max-w-3xl relative z-10">
        <Link href="/register/pme/documents" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Signature des contrats</CardTitle>
            <CardDescription>
              Étape 4/4 : Acceptation des contrats obligatoires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!canContinue && (
              <Alert>
                <AlertDescription>
                  Veuillez accepter tous les contrats pour continuer
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {CONTRACTS.map((contract) => {
                const isSigned = signedContracts.has(contract.id)
                const isAccepted = accepted[contract.id]
                return (
                  <Card 
                    key={contract.id} 
                    className={`transition-all ${isSigned ? "border-accent bg-accent/5" : "border-border hover:border-primary/50"} ${!isSigned && !loading ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (!isSigned && !loading && !isAccepted) {
                        handleAccept(contract.id)
                      }
                    }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-foreground">{contract.title}</h3>
                            {isSigned && <CheckCircle2 className="h-4 w-4 text-accent" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">{contract.description}</p>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={contract.id}
                              checked={isAccepted}
                              onCheckedChange={(checked) => {
                                const isChecked = checked === true
                                if (isChecked && !isSigned) {
                                  handleAccept(contract.id)
                                } else if (!isChecked && !isSigned) {
                                  setAccepted((prev) => ({ ...prev, [contract.id]: false }))
                                }
                              }}
                              disabled={loading || isSigned}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            />
                            <Label
                              htmlFor={contract.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!isSigned && !loading) {
                                  const checkbox = document.getElementById(contract.id) as HTMLButtonElement
                                  if (checkbox && !checkbox.disabled) {
                                    const currentChecked = isAccepted
                                    checkbox.click()
                                    // Toggle manually if needed
                                    if (currentChecked) {
                                      setAccepted((prev) => ({ ...prev, [contract.id]: false }))
                                    }
                                  }
                                }
                              }}
                            >
                              J'accepte les termes de ce contrat
                            </Label>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(`/api/register/pme/contracts/preview?type=${contract.id}`, '_blank')
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Voir le contrat complet
                            </Button>
                            {isAccepted && !isSigned && (
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Enregistrement...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/register/pme/documents")}
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

