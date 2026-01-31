'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CurrencyTicker } from "@/components/currency-ticker"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function BankNav({ bank }: any) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } catch (error) {
      console.error("[logout] Error:", error)
    }
    window.location.href = "/bank/login"
  }

  return (
    <div className="sticky top-0 z-40">
      <CurrencyTicker />
      <nav className="bg-accent text-accent-foreground border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">DIRECT DEVISE</h2>
            <p className="text-sm text-accent-foreground/80">{bank.bankName}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/bank/operations">
              <Button variant="ghost" className="text-accent-foreground hover:bg-accent-foreground/10">
                Opérations
              </Button>
            </Link>
            <Link href="/bank/auctions">
              <Button variant="ghost" className="text-accent-foreground hover:bg-accent-foreground/10">
                Enchères
              </Button>
            </Link>
            <ThemeSwitcher />
            <Button
              variant="ghost"
              className="text-accent-foreground hover:bg-accent-foreground/10"
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
