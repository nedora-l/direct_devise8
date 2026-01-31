import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BankNav from "@/components/bank/bank-nav"

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

async function placeBidAction(formData: FormData) {
  "use server"
  const prisma = getPrisma()
  const auctionId = String(formData.get("auctionId") || "")
  const bankId = String(formData.get("bankId") || "")
  const bankName = String(formData.get("bankName") || "")
  const rate = Number(formData.get("rate") || 0)
  // Prisma schema requires charges (non-null). We force 0 since we removed the field from UI.
  // Une seule proposition par banque et par enchère pour éviter le spam.
  const existing = await prisma.bid.findFirst({ where: { auctionId, bankId } })
  if (existing) {
    // Ignorer toute nouvelle tentative (à terme: retourner un message)
    return
  }
  await prisma.bid.create({ data: { auctionId, bankId, bankName, rate, charges: 0, terms: "Standard IGOC" } })
  revalidatePath("/bank/operations")
}

export default async function BankOperations() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "bank") redirect("/bank/login")
  const prisma = getPrisma()
  const bankUser = (session as any).user
  // Confidentialité : on ne renvoie que les bids de la banque connectée
  const auctions = await prisma.auction.findMany({
    include: { company: true, bids: { where: { bankId: bankUser.id } } },
    orderBy: { createdAt: "desc" },
  })

  const activeAuctions = auctions.filter(a => a.status === "active")
  const today = new Date().toISOString().slice(0,10)
  const processedToday = auctions.filter(a => a.status === "closed" && new Date(a.createdAt).toISOString().slice(0,10) === today).length
  const volumeEUR = activeAuctions.filter(a => a.sourceCurrency === "EUR").reduce((sum, a) => sum + Number(a.amount || 0), 0)
  const avgRate = 0

  return (
    <div className="min-h-screen bg-background">
      <BankNav bank={bankUser} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{bankUser.bankName || bankUser.name || "Banque"}</h1>
        <p className="text-muted-foreground mb-8">Salle de Marché - Traitement des opérations de change</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-muted-foreground">En attente</p><p className="text-2xl font-bold text-accent">{activeAuctions.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-muted-foreground">Traitées (J)</p><p className="text-2xl font-bold text-primary">{processedToday}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-muted-foreground">Volume (EUR)</p><p className="text-2xl font-bold">€{fmt(Math.round(volumeEUR/1000))}K</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-muted-foreground">Taux Moyen</p><p className="text-2xl font-bold font-mono">{avgRate > 0 ? avgRate : "--"}</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">En Attente</TabsTrigger>
            <TabsTrigger value="deals">Deal</TabsTrigger>
            <TabsTrigger value="execution">Suivi</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="space-y-3">
              {activeAuctions.map(a => {
                const bankBid = a.bids?.[0]
                const alreadyBid = Boolean(bankBid)
                return (
                <div key={a.id} className="p-4 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{a.company?.name || "Entreprise"}</p>
                      <p className="text-xs text-muted-foreground">{a.sourceCurrency} → {a.targetCurrency}</p>
                    </div>
                    <p className="font-bold">{fmt(Number(a.amount||0))} {a.sourceCurrency}</p>
                  </div>
                  <form action={placeBidAction} className="grid grid-cols-3 gap-2 mt-3">
                    <input type="hidden" name="auctionId" value={a.id} />
                    <input type="hidden" name="bankId" value={bankUser.id} />
                    <input type="hidden" name="bankName" value={bankUser.bankName || bankUser.name || "Banque"} />
                    <input
                      name="rate"
                      placeholder="Taux"
                      defaultValue={bankBid ? String(bankBid.rate) : ""}
                      disabled={alreadyBid}
                      className="border rounded px-2 py-1 text-sm disabled:bg-muted/50"
                    />
                    <button
                      className="border rounded px-2 py-1 text-sm bg-primary text-primary-foreground disabled:opacity-50"
                      type="submit"
                      disabled={alreadyBid}
                    >
                      {alreadyBid ? "Déjà proposé" : "Proposer"}
                    </button>
                  </form>
                  {alreadyBid && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Offre envoyée. Une seule proposition par enchère.
                    </p>
                  )}
                </div>
              )})}
            </div>
          </TabsContent>

          <TabsContent value="deals">
            <div className="space-y-3">
              {auctions.length === 0 && (
                <div className="p-4 border rounded text-sm text-muted-foreground">
                  Aucune enchère en cours.
                </div>
              )}
              {auctions.map(a => {
                const bankBid = a.bids?.[0]
                return (
                  <div key={a.id} className="p-4 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{a.company?.name || "Entreprise"}</p>
                        <p className="text-xs text-muted-foreground">{a.sourceCurrency} → {a.targetCurrency}</p>
                      </div>
                      <p className="font-bold text-sm">{fmt(Number(a.amount || 0))} {a.sourceCurrency}</p>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p>Statut: {a.status || "active"}</p>
                      {a.endsAt && <p>Expiration: {new Date(a.endsAt).toLocaleString("fr-FR")}</p>}
                      {bankBid ? (
                        <p>Votre taux proposé: {bankBid.rate}</p>
                      ) : (
                        <p>Vous n'avez pas encore proposé sur cette enchère.</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="execution">
            <div className="space-y-3">
              {/* Placeholder for future execution tracking based on Transactions */}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
