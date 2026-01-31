import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TrendingUp, Zap, Clock } from "lucide-react"

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export default async function ValidationsPage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).user || (session as any).user.role !== "pme") {
    redirect("/pme/login")
  }
  const prisma = getPrisma()
  const userId = (session as any).user.id as string
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
  if (!user || !user.company) redirect("/pme/login")

  const companyId = user.company.id
  // Récupérer tous les SWIFT (validés et en attente) pour voir l'historique complet
  const allSwifts = await prisma.swift.findMany({ 
    where: { companyId }, 
    orderBy: { createdAt: "desc" } 
  })
  const swifts = allSwifts.filter(s => s.validated === true) // Validés uniquement pour les stats
  const pendingSwifts = allSwifts.filter(s => s.validated === false && s.adminStatus === "pending")
  const auctions = await prisma.auction.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } })

  const total = swifts.reduce((sum, s) => sum + Number(s.amount || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mes Validations SWIFT</h1>
            <p className="text-muted-foreground">Entreprise: {user.company.name}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/pme/dashboard">Retour au Dashboard</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>SWIFT Validés</CardDescription>
              <CardTitle className="text-3xl">{swifts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Enchères Actives</CardDescription>
              <CardTitle className="text-3xl">{auctions.filter(a => a.status === 'active').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Montant Total</CardDescription>
              <CardTitle className="text-3xl">{fmt(total)} EUR</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* SWIFT en attente de validation */}
        {pendingSwifts.length > 0 && (
          <Card className="border-amber-600/20 bg-amber-600/5 mb-6">
            <CardHeader>
              <CardTitle className="text-amber-700">SWIFT en attente de validation ({pendingSwifts.length})</CardTitle>
              <CardDescription>Vos SWIFT sont en cours de validation par l'administrateur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingSwifts.map(s => (
                <Card key={s.id} className="border-amber-600/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{String(s.currency).toUpperCase()} {fmt(Number(s.amount || 0))}</h3>
                          <Badge className="bg-amber-600">En attente</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Référence</p>
                            <p className="font-mono">{s.reference}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Date upload</p>
                            <p>{new Date(s.createdAt).toISOString().slice(0,10)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Statut</p>
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              {s.adminStatus.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* SWIFT validés */}
        {swifts.length === 0 && pendingSwifts.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">Aucun SWIFT pour le moment</p>
              <Button asChild className="mt-4">
                <Link href="/pme/dashboard">Retour au Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : swifts.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">Aucun SWIFT validé pour le moment</p>
              <p className="text-xs text-muted-foreground mt-2">
                {pendingSwifts.length} SWIFT en attente de validation
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {swifts.map(s => {
              const hasAuction = auctions.some(a => a.swiftReference === s.reference)
              return (
                <Card key={s.id} className="border-green-600/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{String(s.currency).toUpperCase()} {fmt(Number(s.amount || 0))}</h3>
                          {hasAuction && <Badge className="bg-blue-600">Enchère créée</Badge>}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Référence</p>
                            <p className="font-mono">{s.reference}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Date validation</p>
                            <p>{s.validatedAt ? new Date(s.validatedAt).toISOString().slice(0,10) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Statut</p>
                            <Badge variant="outline" className="text-green-600 border-green-600">Validé</Badge>
                          </div>
                          {s.expiresAt && (
                            <div>
                              <p className="text-muted-foreground">Expire le</p>
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(s.expiresAt).toISOString().slice(0,10)}
                              </p>
                            </div>
                          )}
                        </div>
                        {/* Afficher la stratégie configurée */}
                        {s.rateStrategy && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {s.rateStrategy === "spotting" ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <Zap className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="font-semibold text-sm">
                                Stratégie: {s.rateStrategy === "spotting" ? "Spotting des taux" : "Enchère directe"}
                              </span>
                            </div>
                            {s.rateStrategy === "spotting" && s.targetRate && s.targetCurrency && (
                              <div className="text-xs text-foreground/80 dark:text-foreground/90 space-y-1">
                                <p>Taux cible: <span className="font-semibold text-foreground dark:text-foreground">{s.targetRate}</span> {s.targetCurrency}</p>
                                {s.rateTriggeredAt ? (
                                  <p className="text-green-700 dark:text-green-400 font-medium">✓ Taux atteint le {new Date(s.rateTriggeredAt).toISOString().slice(0,10)}</p>
                                ) : (
                                  <p className="text-amber-700 dark:text-amber-400 font-medium">⏳ En attente du taux cible</p>
                                )}
                              </div>
                            )}
                            {s.splitMode && (
                              <div className="text-xs text-foreground/70 dark:text-foreground/80 mt-1">
                                Répartition: {s.splitMode === "IGOC_30" ? "IGOC 30% (70/30)" : "Conversion 100%"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!hasAuction && (
                        <div className="flex gap-2">
                          {!s.rateStrategy ? (
                            <>
                              <Button asChild variant="outline">
                                <Link href={`/pme/swift-strategy?swiftId=${s.id}`}>
                                  Choisir stratégie
                                </Link>
                              </Button>
                              <Button asChild>
                                <Link href={`/pme/create-auction?ref=${encodeURIComponent(s.reference)}&currency=${encodeURIComponent(s.currency)}&mode=IGOC_30&amount=${Math.round(Number(s.amount||0)*0.3)}`}>
                                  Créer Enchère
                                </Link>
                              </Button>
                            </>
                          ) : s.rateStrategy === "auction" ? (
                            <Button asChild>
                              <Link href={`/pme/create-auction?ref=${encodeURIComponent(s.reference)}&currency=${encodeURIComponent(s.currency)}&mode=${s.splitMode || "IGOC_30"}&amount=${s.splitMode === "FULL_100" ? Math.round(Number(s.amount||0)) : Math.round(Number(s.amount||0)*0.3)}`}>
                                Créer Enchère
                              </Link>
                            </Button>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/pme/swift-strategy?swiftId=${s.id}`}>
                                  Modifier stratégie
                                </Link>
                              </Button>
                              <p className="text-xs text-muted-foreground text-center">
                                En attente du taux cible
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
