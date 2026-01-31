"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2, Landmark } from 'lucide-react'
import { AnimatedBackground } from "@/components/animated-background"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-background text-foreground">
      <AnimatedBackground />
      
      <div className="w-full max-w-2xl relative z-10">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'accueil
        </Link>

        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">Rejoignez Direct Devise</h1>
          <p className="text-xl text-muted-foreground font-light">Sélectionnez votre type de compte pour commencer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PME Option */}
          <Link href="/register/pme" className="group relative bg-card hover:bg-card/80 border border-border p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-2xl font-serif mb-2">Entreprise / PME</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Je souhaite échanger des devises aux meilleurs taux du marché pour mon activité.
            </p>
            <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
              Créer un compte PME <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </div>
          </Link>

          {/* Bank Option */}
          <Link href="/bank/login" className="group relative bg-card hover:bg-card/80 border border-border p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Landmark className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-2xl font-serif mb-2">Banque / Trader</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Je représente une institution financière et je souhaite accéder au flux d'ordres.
            </p>
            <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
              Accès Salle de Marché <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </div>
          </Link>
        </div>

        <p className="text-center mt-12 text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
