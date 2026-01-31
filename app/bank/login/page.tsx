"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from 'lucide-react'
import { AuthValidator } from "@/lib/auth-utils"
import { signIn } from "next-auth/react"
import { audit } from "@/lib/audit-logger"

export default function BankLogin() {
  const [bankCode, setBankCode] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setServerError("")
    setErrors({})

    try {
      // Validate form
      if (!bankCode.trim()) {
        setErrors({ bankCode: "Code banque requis" })
        setLoading(false)
        return
      }
      if (!apiKey.trim()) {
        setErrors({ apiKey: "Clé API requise" })
        setLoading(false)
        return
      }

      const res = await signIn("credentials", { email: bankCode, password: apiKey, role: "bank", redirect: false })
      if (res && res.error) {
        setServerError("Code banque ou clé API invalide")
        audit.log("unknown", "bank", "LOGIN", "authentication", bankCode, {}, "failure", res.error)
        setLoading(false)
        return
      }

      audit.log("unknown", "bank", "LOGIN", "authentication", bankCode, { bankCode })
      window.location.href = "/bank/operations"
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur de connexion"
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="bg-accent text-accent-foreground rounded-t-lg">
          <CardTitle>DIRECT DEVISE</CardTitle>
          <CardDescription className="text-accent-foreground/80">Portail Banque Partenaire</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {serverError && (
              <Alert className="border-destructive bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="bankCode">Code Banque</Label>
              <Input
                id="bankCode"
                placeholder="BMCEMAMC"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                disabled={loading}
                className={errors.bankCode ? "border-destructive" : "border-input"}
              />
              {errors.bankCode && <p className="text-xs text-destructive">{errors.bankCode}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Clé API</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={loading}
                className={errors.apiKey ? "border-destructive" : "border-input"}
              />
              {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Connexion..." : "Se connecter"}
            </Button>

            <div className="text-center space-y-2 text-sm">
              <p className="text-muted-foreground">
                Démo: bank@demo.com / Demo12345
              </p>
              <Link href="#" className="text-primary hover:underline block">
                Support API
              </Link>
              <div className="pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground mb-2">Accès autres portails :</p>
                <div className="flex gap-2 justify-center">
                  <Link href="/pme/login">
                    <Button type="button" variant="outline" size="sm">PME</Button>
                  </Link>
                  <Link href="/admin/login">
                    <Button type="button" variant="outline" size="sm">Admin</Button>
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
