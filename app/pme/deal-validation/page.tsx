import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect, revalidatePath } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import PMENav from "@/components/pme/pme-nav"

function fmt(n: number): string { return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n) }

async function finalizeDealAction(formData: FormData) {
  "use server"
  const prisma = getPrisma()
  const txId = String(formData.get('txId')||'')
  const comments = String(formData.get('comments')||'')
  if (txId) {
    await prisma.transaction.update({ where: { id: txId }, data: { status: 'completed' } })
  }
  revalidatePath('/pme/dashboard')
  revalidatePath('/bank/operations')
}

export default async function DealValidation() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')
  const tx = await prisma.transaction.findFirst({ where: { companyId: userRow.company.id, status: 'accepted' }, orderBy: { createdAt: 'desc' } })
  const auction = tx ? await prisma.auction.findUnique({ where: { id: tx.auctionId || '' }, include: { bids: true } }) : null
  const bestBid = auction && auction.bids.length>0 ? auction.bids.sort((a,b)=>Number(b.rate||0)-Number(a.rate||0))[0] : null
  if (!tx || !auction || !bestBid) {
    return (
      <div className="min-h-screen bg-background">
        <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />
        <main className="container mx-auto px-4 py-8">
          <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">Aucun deal en attente de validation finale.</p></CardContent></Card>
        </main>
      </div>
    )
  }
  const dealData = {
    id: `DEAL-${tx.id.slice(0,8)}`,
    amount: fmt(Number(auction.amount||0)),
    currency: auction.sourceCurrency,
    rate: Number(bestBid.rate||0).toFixed(4),
    converted: fmt(Math.round(Number(auction.amount||0)*Number(bestBid.rate||0))),
    commission: fmt(Number(bestBid.charges||0)),
    net: fmt(Math.round(Number(auction.amount||0)*Number(bestBid.rate||0)) - Math.round(Number(bestBid.charges||0))),
    bank: bestBid.bankName,
    timeLimit: new Date().toISOString().slice(11,16),
    notifications: [],
  }

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Validation de l'Offre de Change</h1>
          <p className="text-muted-foreground mb-8">Confirmez le meilleur taux proposé par nos banques partenaires</p>

          {/* Notification */}
          <Card className="mb-6 border-accent bg-accent/5">
            <CardContent className="pt-6">
              <p className="font-medium">
                Vous avez reçu une offre de change de <span className="font-bold text-accent">{dealData.bank}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Validez avant <span className="font-bold">{dealData.timeLimit}</span> pour l'exécution immédiate
              </p>
            </CardContent>
          </Card>

          {/* Deal Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Détails de l'Offre</CardTitle>
              <CardDescription>Ref: {dealData.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Montant Initial</p>
                  <p className="text-lg font-bold">
                    {dealData.currency} {dealData.amount}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Taux de Change</p>
                  <p className="text-lg font-bold">{dealData.rate}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Montant Converti (MAD)</p>
                  <p className="text-lg font-bold">{dealData.converted}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Commission DD</p>
                  <p className="text-lg font-bold">- {dealData.commission}</p>
                </div>
              </div>

              <div className="p-4 bg-primary/10 border border-primary rounded-lg">
                <p className="text-xs text-muted-foreground">Montant Net à Virer</p>
                <p className="text-2xl font-bold text-primary">MAD {dealData.net}</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Délai estimé: <span className="font-medium text-foreground">1-2 heures</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Historique des Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dealData.notifications.map((notif) => (
                  <div key={notif.channel} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{notif.channel}</p>
                      <p className="text-xs text-muted-foreground">Envoyé à {notif.sent}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        notif.status === "confirmé" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {notif.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Commentaires (Facultatif)</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={finalizeDealAction}>
                <input type="hidden" name="txId" value={tx.id} />
                <Textarea name="comments" placeholder="Ajoutez des commentaires ou instructions spéciales..." />
              </form>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <form action={finalizeDealAction} className="flex-1">
              <input type="hidden" name="txId" value={tx.id} />
              <Button className="w-full" size="lg" type="submit">Valider l'Offre</Button>
            </form>
            <Button variant="outline" size="lg" className="flex-1 bg-transparent" asChild>
              <a href="/pme/active-auctions">Refuser / Renégocier</a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
