"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft } from 'lucide-react'
import { AnimatedBackground } from "@/components/animated-background"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    if (email.includes("admin")) router.push("/admin/dashboard")
    else if (email.includes("bank")) router.push("/bank/dashboard")
    else router.push("/pme/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-background text-foreground">
      <AnimatedBackground />
      
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'accueil
        </Link>

        <div className="bg-card border border-border shadow-xl rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-medium mb-2">Bon retour</h1>
            <p className="text-muted-foreground">Accédez à votre espace sécurisé</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email professionnel</Label>
              <Input
                id="email"
                type="email"
                placeholder="nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-background transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-background transition-all"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl text-base font-medium" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Se connecter"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-4 text-center uppercase tracking-wider">Comptes de démonstration</p>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => { setEmail("contact@pme.com"); setPassword("demo"); }} className="py-2 px-4 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors">
                PME
              </button>
              <button onClick={() => { setEmail("agent@bank.com"); setPassword("demo"); }} className="py-2 px-4 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors">
                Banque
              </button>
              <button onClick={() => { setEmail("admin@directdevise.com"); setPassword("demo"); }} className="py-2 px-4 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors">
                Admin
              </button>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline underline-offset-4">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
