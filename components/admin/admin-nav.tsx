'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CurrencyTicker } from "@/components/currency-ticker"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function AdminNav({ admin }: any) {
  const handleLogout = async () => {
    // Clear session via API instead of localStorage
    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } catch (error) {
      console.error("[logout] Error:", error)
    }
    window.location.href = "/admin/login"
  }

  return (
    <div className="sticky top-0 z-40">
      <CurrencyTicker />
      <nav className="bg-secondary text-secondary-foreground border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">DIRECT DEVISE</h2>
            <p className="text-sm text-secondary-foreground/80">Administration</p>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/admin/dashboard">
              <Button variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10">
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/account-approval">
              <Button variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10">
                Approbation
              </Button>
            </Link>
            <Link href="/admin/kyc-verification">
              <Button variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10">
                KYC
              </Button>
            </Link>
            <Link href="/admin/swift-validation">
              <Button variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10">
                SWIFT
              </Button>
            </Link>
            <Link href="/admin/reverse-auctions">
              <Button variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10">
                Enchères
              </Button>
            </Link>
            <ThemeSwitcher />
            <Button
              variant="ghost"
              className="text-secondary-foreground hover:bg-secondary-foreground/10"
              onClick={handleLogout}
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </nav>
    </div>
  )
}
