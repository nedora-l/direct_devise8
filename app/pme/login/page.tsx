"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthValidator } from "@/lib/auth-utils"
import { signIn } from "next-auth/react"
import { audit } from "@/lib/audit-logger"

export default function PMELogin() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setServerError("")
    setErrors({})

    try {
      // Validate form
      const validation = AuthValidator.validateLoginForm(email, password)
      if (!validation.valid) {
        setErrors(validation.errors)
        setLoading(false)
        return
      }

      const res = await signIn("credentials", { email, password, role: "pme", redirect: false })
      if (res && res.error) {
        setServerError("Email ou mot de passe incorrect")
        audit.log("unknown", "pme", "LOGIN", "authentication", email, {}, "failure", res.error)
        setLoading(false)
        return
      }

      // Login successful, check KYC status from DB
      try {
        const kycStatusResponse = await fetch(`/api/kyc/status?email=${encodeURIComponent(email)}`)
        if (kycStatusResponse.ok) {
          const kycData = await kycStatusResponse.json()
          audit.log("unknown", "pme", "LOGIN", "authentication", email, { email, companyId: kycData.companyId })

          // Redirect based on KYC status
          if (kycData.kycStatus === "approved") {
            router.push("/pme/dashboard")
          } else if (kycData.kycStatus === "pending" || kycData.kycStatus === "reviewing") {
            router.push(`/register/pme/waiting?companyId=${kycData.companyId}`)
          } else if (kycData.kycStatus === "rejected") {
            router.push("/pme/kyc-onboarding?rejected=true")
          } else {
            // Default: redirect to waiting page
            router.push(`/register/pme/waiting?companyId=${kycData.companyId}`)
          }
        } else {
          // If KYC status check fails, redirect to dashboard (fallback)
          audit.log("unknown", "pme", "LOGIN", "authentication", email, { email })
          router.push("/pme/dashboard")
        }
      } catch (error) {
        console.error("[login] Error checking KYC status:", error)
        audit.log("unknown", "pme", "LOGIN", "authentication", email, { email })
        router.push("/pme/dashboard")
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur de connexion"
      setServerError(msg)
      audit.log("unknown", "pme", "LOGIN", "authentication", email, {}, "failure", msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
          <CardTitle>DIRECT DEVISE</CardTitle>
          <CardDescription className="text-primary-foreground/80">Portail Client - PME</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
              <Alert className="border-destructive bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={errors.email ? "border-destructive" : "border-input"}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={errors.password ? "border-destructive" : "border-input"}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Connexion..." : "Se connecter"}
            </Button>

            <div className="text-center space-y-2 text-sm">
              <p className="text-muted-foreground">
                Démo: pme@demo.com / Demo12345
              </p>
              <Link href="#" className="text-primary hover:underline block">
                Mot de passe oublié ?
              </Link>
              <Link href="/register/pme" className="text-primary hover:underline block">
                Créer un compte
              </Link>
              <div className="pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground mb-2">Accès autres portails :</p>
                <div className="flex gap-2 justify-center">
                  <Link href="/admin/login">
                    <Button type="button" variant="outline" size="sm">Admin</Button>
                  </Link>
                  <Link href="/bank/login">
                    <Button type="button" variant="outline" size="sm">Banque</Button>
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
