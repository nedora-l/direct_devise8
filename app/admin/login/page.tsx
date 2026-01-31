"use client"

import type React from "react"
import Link from "next/link"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from 'lucide-react'
import { AuthValidator } from "@/lib/auth-utils"
import { signIn } from "next-auth/react"
import { audit } from "@/lib/audit-logger"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
      const validation = AuthValidator.validateLoginForm(email, password)
      if (!validation.valid) {
        setErrors(validation.errors)
        setLoading(false)
        return
      }

      const res = await signIn("credentials", { email, password, role: "admin", redirect: false })
      if (res && res.error) {
        setServerError("Email ou mot de passe incorrect")
        audit.log("unknown", "admin", "LOGIN", "authentication", email, {}, "failure", res.error)
        setLoading(false)
        return
      }
      audit.log("unknown", "admin", "LOGIN", "authentication", email, { email })

      try {
        await fetch("/api/migrate/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshots: [{ email, role: "admin" }] }) })
      } catch {}
      window.location.href = "/admin/dashboard"
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
        <CardHeader className="bg-secondary text-secondary-foreground rounded-t-lg">
          <CardTitle>DIRECT DEVISE</CardTitle>
          <CardDescription className="text-secondary-foreground/80">Administration & Gestion</CardDescription>
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
              <Label htmlFor="email">Email Admin</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@direct-devise.ma"
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

            <p className="text-center text-sm text-muted-foreground">
              Démo: admin@demo.com / Demo12345
            </p>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-2">Accès autres portails :</p>
              <div className="flex gap-2 justify-center">
                <Link href="/pme/login">
                  <Button type="button" variant="outline" size="sm">PME</Button>
                </Link>
                <Link href="/bank/login">
                  <Button type="button" variant="outline" size="sm">Banque</Button>
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
