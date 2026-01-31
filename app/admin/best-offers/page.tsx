import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect, revalidatePath } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, CheckCircle } from "lucide-react"
import AdminNav from "@/components/admin/admin-nav"

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export const dynamic = "force-dynamic"

async function selectOfferAction(formData: FormData) {
  "use server"
  const prisma = getPrisma()
  const bidId = String(formData.get("bidId") || "")
  const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { auction: true } })
  if (!bid || !bid.auction) return revalidatePath("/admin/best-offers")
  await prisma.transaction.create({
    data: {
      auctionId: bid.auctionId,
      companyId: bid.auction.companyId,
      amount: Number(bid.auction.amount || 0),
      exchangeCurrency: bid.auction.targetCurrency,
      rate: Number(bid.rate || 0),
      status: "initiated",
    }
  })
  revalidatePath("/admin/best-offers")
}

async function transmitOfferAction(formData: FormData) {
  "use server"
  const prisma = getPrisma()
  const bidId = String(formData.get("bidId") || "")
  const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { auction: true } })
  if (!bid || !bid.auction) return revalidatePath("/admin/best-offers")
  await prisma.transaction.updateMany({
    where: { auctionId: bid.auctionId, rate: Number(bid.rate || 0) },
    data: { status: "transmitted" }
  })
  revalidatePath("/admin/best-offers")
}

export default async function BestOffers() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") redirect("/admin/login")
  const prisma = getPrisma()
  const adminUser = (session as any).user
  const offers = await prisma.bid.findMany({
    include: { auction: { include: { company: true } } },
    orderBy: { timestamp: "desc" }
  })

  return (
    <div className="min-h-screen bg-background">
      <AdminNav admin={adminUser} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Réception des Meilleures Offres Bancaires</h1>
          <p className="text-muted-foreground">Sélection et transmission des meilleures taux pour validation client</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Offres Reçues en Temps Réel
                </CardTitle>
                <CardDescription>{offers.length} offres reçues des banques partenaires</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {offers.map((offer) => (
                  <div key={offer.id} className={`p-4 border rounded-lg cursor-pointer transition-all border-border hover:border-accent/50`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg">{offer.bankName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(offer.timestamp).toISOString().slice(0,10)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-blue-500/20 text-blue-700">Nouvelle offre</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Taux</p>
                        <p className="font-bold text-accent">{fmt(Number(offer.rate || 0))}</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="font-bold">{fmt(Number(offer.auction?.amount || 0))} {offer.auction?.sourceCurrency}</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Entreprise</p>
                        <p className="font-bold text-sm">{offer.auction?.company?.name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xs text-muted-foreground">Conditions: {offer.terms || "Standard IGOC"}</span>
                      <span className="text-xs font-medium">Commission: {fmt(Number(offer.charges || 0))} MAD</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <form action={selectOfferAction}>
                        <input type="hidden" name="bidId" value={offer.id} />
                        <Button className="w-full">Sélectionner</Button>
                      </form>
                      <form action={transmitOfferAction}>
                        <input type="hidden" name="bidId" value={offer.id} />
                        <Button variant="outline" className="w-full">Transmettre au Client</Button>
                      </form>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">Sélectionnez une offre pour voir les détails</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
