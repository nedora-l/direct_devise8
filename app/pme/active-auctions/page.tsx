import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PMENav from "@/components/pme/pme-nav"
import { TrendingUp, Clock, Users, Trophy, ArrowRight } from 'lucide-react'
function fmt(n: number): string { return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n) }

export default async function ActiveAuctionsPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')
  const auctions = await prisma.auction.findMany({ where: { companyId: userRow.company.id }, include: { bids: true }, orderBy: { createdAt: 'desc' } })

  const getTimeRemaining = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now()
    if (diff <= 0) return "Terminée"
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m restantes`
  }

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Mes Enchères</h1>
            <p className="text-muted-foreground">Suivez vos enchères et les offres des banques en temps réel</p>
          </div>

          {auctions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Aucune enchère en cours</p>
                  <p className="text-muted-foreground mb-6">Créez votre première enchère pour obtenir les meilleurs taux</p>
                  <Button asChild>
                    <a href="/pme/create-auction">Commencer <ArrowRight className="ml-2 h-4 w-4" /></a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {auctions.map((auction) => (
                <Card key={auction.id} className="border-blue-600/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{auction.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {auction.sourceCurrency} → {auction.targetCurrency}
                        </CardDescription>
                      </div>
                      <Badge variant={auction.status === 'active' ? 'default' : 'secondary'}>
                        {auction.status === 'active' ? 'En cours' : 'Terminée'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Montant</p>
                        <p className="text-xl font-bold text-primary">
                          {fmt(Number(auction.amount||0))} {auction.sourceCurrency}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Offres reçues
                        </p>
                        <p className="text-xl font-bold">{auction.bids.length}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Meilleur taux
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          {auction.bids.length>0 ? Number(Math.max(...auction.bids.map(b=>Number(b.rate||0)))).toFixed(4) : '-'}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Temps restant
                        </p>
                        <p className="text-sm font-medium">{getTimeRemaining(auction.endsAt)}</p>
                      </div>
                    </div>

                    {auction.bids.length>0 && (
                      <div className="p-4 bg-green-600/5 border border-green-600/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Meilleure offre actuelle</p>
                            <p className="font-semibold text-lg">{auction.bids.sort((a,b)=>Number(b.rate||0)-Number(a.rate||0))[0].bankName}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Taux: {Number(auction.bids.sort((a,b)=>Number(b.rate||0)-Number(a.rate||0))[0].rate||0).toFixed(4)} • Frais: {Number(auction.bids.sort((a,b)=>Number(b.rate||0)-Number(a.rate||0))[0].charges||0).toFixed(2)} {auction.targetCurrency}
                            </p>
                          </div>
                          <Trophy className="h-8 w-8 text-green-600" />
                        </div>
                      </div>
                    )}

                    {auction.bids.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Toutes les offres ({auction.bids.length})</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {auction.bids
                            .sort((a, b) => Number(b.rate||0) - Number(a.rate||0))
                            .map((bid, idx) => (
                              <div key={bid.id} className="p-3 border rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {idx === 0 && <Trophy className="h-4 w-4 text-yellow-600" />}
                                  <div>
                                    <p className="font-medium">{bid.bankName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(bid.timestamp).toISOString().slice(0,16).replace('T',' ')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{Number(bid.rate||0).toFixed(4)}</p>
                                  <p className="text-xs text-muted-foreground">Frais: {Number(bid.charges||0).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {auction.bids.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>En attente des offres des banques...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
