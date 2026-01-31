import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PMENav from "@/components/pme/pme-nav"

export default async function NotificationPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') {
    return <div />
  }
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) return <div />
  const auctions = await prisma.auction.findMany({ where: { companyId: userRow.company.id }, include: { bids: true }, orderBy: { createdAt: 'desc' } })
  const bids = auctions.flatMap(a => a.bids.map(b => ({ bid: b, auction: a }))).sort((x,y)=> new Date(y.bid.timestamp).getTime() - new Date(x.bid.timestamp).getTime())
  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Notifications d'Offres</h1>
        <Card>
          <CardHeader>
            <CardTitle>Offres Reçues</CardTitle>
          </CardHeader>
          <CardContent>
            {bids.length === 0 ? (
              <p className="text-muted-foreground">Aucune offre pour le moment</p>
            ) : (
              <div className="space-y-2">
                {bids.map(({bid, auction}) => (
                  <div key={bid.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{bid.bankName}</p>
                      <p className="text-xs text-muted-foreground">{auction.sourceCurrency} → {auction.targetCurrency} • {new Date(bid.timestamp).toISOString().slice(0,16).replace('T',' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{Number(bid.rate||0).toFixed(4)}</p>
                      <p className="text-xs text-muted-foreground">Frais: {Number(bid.charges||0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
