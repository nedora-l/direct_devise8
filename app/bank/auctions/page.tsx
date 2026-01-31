import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import BankNav from "@/components/bank/bank-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export default async function BankAuctionsPage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).user || (session as any).user.role !== "bank") {
    redirect("/bank/login")
  }

  const prisma = getPrisma()
  // Confidentialité : ne pas exposer les bids des autres banques
  // Afficher toutes les enchères actives avec KYC approuvé
  const auctions = await prisma.auction.findMany({
    where: { 
      status: "active",
      company: {
        kyc: {
          complianceStatus: "approved"
        }
      }
    },
    include: { 
      company: { 
        include: { 
          kyc: true,
          swifts: {
            where: { validated: true },
          }
        }
      }
    },
    orderBy: { endsAt: "asc" }
  })
  
  // Filtrer pour ne garder que celles avec KYC approuvé et SWIFT validé (si swiftReference existe)
  const validAuctions = auctions.filter(a => {
    if (a.company.kyc?.complianceStatus !== "approved") return false
    if (a.swiftReference) {
      const matchingSwift = a.company.swifts.find(s => s.reference === a.swiftReference)
      return matchingSwift?.validated === true
    }
    return true // Pas de swiftReference = OK si KYC approuvé
  })

  return (
    <div className="min-h-screen bg-background">
      <BankNav bank={session.user as any} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Enchères de Change</h1>
          <p className="text-muted-foreground">Banque authentifiée</p>
          <div className="mt-3">
            <Button variant="outline" asChild>
              <a href="/bank/operations">Retour aux opérations</a>
            </Button>
          </div>
        </div>

        {validAuctions.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <p className="text-foreground/70 dark:text-foreground/80">Aucune enchère active</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {validAuctions.map(a => {
              // Trouver le SWIFT correspondant pour afficher la stratégie
              const matchingSwift = a.swiftReference 
                ? a.company.swifts.find(s => s.reference === a.swiftReference)
                : null
              
              return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <CardDescription className="text-xs">{a.company?.name || "Entreprise"}</CardDescription>
                    </div>
                    <Badge className="bg-green-600">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-foreground/70 dark:text-foreground/80 text-xs">Montant</p>
                      <p className="font-semibold text-foreground dark:text-foreground">{fmt(Number(a.amount || 0))} {a.sourceCurrency}</p>
                    </div>
                    <div>
                      <p className="text-foreground/70 dark:text-foreground/80 text-xs">Conversion</p>
                      <p className="font-semibold text-foreground dark:text-foreground">{a.sourceCurrency} → {a.targetCurrency}</p>
                    </div>
                  </div>
                  {matchingSwift?.rateStrategy === "spotting" && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                        ✓ Créée depuis spotting (taux cible atteint)
                      </p>
                    </div>
                  )}
                  {!matchingSwift && (
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                        Enchère directe
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

