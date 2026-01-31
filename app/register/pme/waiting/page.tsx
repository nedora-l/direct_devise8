"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, CheckCircle2, Clock, ArrowLeft } from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"

export default function PMERegisterWaitingPage() {
  const router = useRouter()
  const [registrationData, setRegistrationData] = useState<any>(null)
  const [kycStatus, setKycStatus] = useState<"pending" | "reviewing" | "approved" | "rejected">("pending")

  useEffect(() => {
    const data = sessionStorage.getItem("pme_registration")
    if (!data) {
      router.push("/register/pme")
      return
    }
    setRegistrationData(JSON.parse(data))
    checkKYCStatus()
    
    // Poll for status updates every 5 seconds
    const interval = setInterval(checkKYCStatus, 5000)
    return () => clearInterval(interval)
  }, [router])

  const checkKYCStatus = async () => {
    if (!registrationData?.companyId) return
    
    try {
      const response = await fetch(`/api/kyc/profile?companyId=${registrationData.companyId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.profile) {
          const status = result.profile.complianceStatus as "pending" | "reviewing" | "approved" | "rejected"
          setKycStatus(status)
          
          if (status === "approved") {
            // Clear registration data and redirect to login
            sessionStorage.removeItem("pme_registration")
            setTimeout(() => {
              router.push("/pme/login?registered=true&approved=true")
            }, 2000)
          }
        } else {
          // Check if verification code was used (KYC approved via code)
          const verifyResponse = await fetch(`/api/register/pme/verification/check?companyId=${registrationData.companyId}`)
          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json()
            if (verifyResult.verified) {
              setKycStatus("approved")
              sessionStorage.removeItem("pme_registration")
              setTimeout(() => {
                router.push("/pme/login?registered=true&approved=true")
              }, 2000)
            }
          }
        }
      }
    } catch (error) {
      // Silently fail
    }
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
      
      <div className="w-full max-w-2xl relative z-10">
        <Card className="border-2 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              {kycStatus === "pending" && (
                <div className="relative">
                  <Clock className="h-16 w-16 text-amber-600 animate-pulse" />
                  <div className="absolute -inset-2 bg-amber-600/10 rounded-full animate-ping" />
                </div>
              )}
              {kycStatus === "reviewing" && (
                <div className="relative">
                  <div className="absolute inset-0 blur-2xl opacity-30">
                    <div className="h-32 w-32 bg-primary rounded-full animate-pulse" />
                  </div>
                  <div className="relative">
                    <Loader2 className="h-20 w-20 text-primary animate-spin" />
                    <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary/60" />
                  </div>
                </div>
              )}
              {kycStatus === "approved" && (
                <div className="relative">
                  <div className="absolute inset-0 bg-green-600/20 rounded-full blur-xl animate-pulse" />
                  <CheckCircle2 className="relative h-20 w-20 text-green-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {kycStatus === "pending" && "En attente de validation"}
              {kycStatus === "reviewing" && "Révision en cours"}
              {kycStatus === "approved" && "Compte approuvé !"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {kycStatus === "pending" && "Votre demande est en attente de révision par un administrateur."}
              {kycStatus === "reviewing" && "Notre équipe examine actuellement votre dossier. Cela prend généralement quelques minutes."}
              {kycStatus === "approved" && "Félicitations ! Votre compte a été approuvé. Vous allez être redirigé vers la page de connexion."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Statut de validation</span>
                <span className="text-sm font-bold text-primary">
                  {kycStatus === "pending" && "EN ATTENTE"}
                  {kycStatus === "reviewing" && "EN RÉVISION"}
                  {kycStatus === "approved" && "APPROUVÉ"}
                </span>
              </div>
              <Progress 
                value={
                  kycStatus === "pending" ? 25 :
                  kycStatus === "reviewing" ? 50 :
                  kycStatus === "approved" ? 100 : 0
                } 
                className="h-2" 
              />
            </div>

            {kycStatus === "reviewing" && (
              <Alert className="border-primary bg-primary/5">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <AlertDescription className="text-primary">
                  Analyse automatique en cours. Les documents seront validés par un administrateur dans les prochaines minutes.
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Vous recevrez un email de confirmation une fois votre compte validé.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/pme/login")}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

