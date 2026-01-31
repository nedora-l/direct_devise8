"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CurrencyTicker } from "@/components/currency-ticker";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { signOut } from "next-auth/react";

type PMENavUser = {
  name: string;
  email: string;
  companyName: string;
  role: "pme";
};

export default function PMENav({ user }: { user: PMENavUser }) {
  const handleLogout = () => {
    signOut({ callbackUrl: "/pme/login" });
  };

  return (
    <div className="sticky top-0 z-40">
      <CurrencyTicker />
      <nav className="bg-primary text-primary-foreground border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">DIRECT DEVISE</h2>
            <p className="text-sm text-primary-foreground/80">
              {user.companyName}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/pme/kyc-onboarding">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                KYC
              </Button>
            </Link>
            <Link href="/pme/dashboard">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/pme/validations">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Validations
              </Button>
            </Link>
            <Link href="/pme/active-auctions">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Enchères
              </Button>
            </Link>
            <Link href="/pme/documents">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Documents
              </Button>
            </Link>
            <ThemeSwitcher />
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleLogout}
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
