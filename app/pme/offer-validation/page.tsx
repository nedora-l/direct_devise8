import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect, revalidatePath } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Send, MessageCircle, Mail, Smartphone } from "lucide-react"
import PMENav from "@/components/pme/pme-nav"
function fmt(n: number): string { return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n) }

async function acceptOfferAction(formData: FormData) {
  "use server"
  const prisma = getPrisma()
  const bidId = String(formData.get('bidId')||'')
  const comments = String(formData.get('comments')||'')
  const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { auction: true } })
  if (!bid || !bid.auction) return revalidatePath('/pme/active-auctions')
  await prisma.transaction.create({ data: { auctionId: bid.auctionId, companyId: bid.auction.companyId, amount: Number(bid.auction.amount||0), exchangeCurrency: bid.auction.targetCurrency, rate: Number(bid.rate||0), status: 'accepted' } })
  await prisma.auction.update({ where: { id: bid.auctionId }, data: { status: 'closed' } })
  revalidatePath('/pme/active-auctions')
  revalidatePath('/bank/operations')
}

async function rejectOfferAction(formData: FormData) {
  "use server"
  const prisma = getPrisma()
  const bidId = String(formData.get('bidId')||'')
  const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { auction: true } })
  if (!bid || !bid.auction) return revalidatePath('/pme/active-auctions')
  await prisma.auction.update({ where: { id: bid.auctionId }, data: { status: 'active' } })
  revalidatePath('/pme/active-auctions')
}

export default async function OfferValidation() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')
  const auctions = await prisma.auction.findMany({ where: { companyId: userRow.company.id, status: 'active' }, include: { bids: true }, orderBy: { createdAt: 'desc' } })
  const auction = auctions[0]
  const bestBid = auction && auction.bids.length>0 ? auction.bids.sort((a,b)=>Number(b.rate||0)-Number(a.rate||0))[0] : null
  if (!auction || !bestBid) {
    return (
      <div className="min-h-screen bg-background">
        <PMENav user={userRow} />
        <main className="container mx-auto px-4 py-8">
          <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">Aucune offre disponible pour validation.</p></CardContent></Card>
        </main>
      </div>
    )
  }
  const offer = {
    id: bestBid.id,
    bankName: bestBid.bankName,
    rate: Number(bestBid.rate||0),
    volume: Number(auction.amount||0),
    amount: Number(auction.amount||0),
    currency: auction.sourceCurrency,
    commission: Number(bestBid.charges||0),
    executionTime: '24h',
    timestamp: bestBid.timestamp.toISOString(),
    clientName: userRow.company.name,
    transactionRef: `TX-${bestBid.id.slice(0,8)}`,
  }
  const conversionMode = 'IGOC_30'

  const convertedAmount = Math.round(offer.amount * offer.rate)
  const netAmount = convertedAmount - offer.commission
  const commissionPercentage = ((offer.commission / convertedAmount) * 100).toFixed(2)
  return (
    <div className="min-h-screen bg-background">
      <PMENav user={userRow} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Validation de l'Offre de Change</h1>
            <p className="text-muted-foreground">Confirmez et validez votre opération de change</p>
            <div className="mt-2">
              <Badge variant="outline" className={conversionMode === "FULL_100" ? "bg-blue-500/10 text-blue-700 border-blue-500/20" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"}>
                Mode: {conversionMode === "FULL_100" ? "Conversion 100%" : "IGOC 30%"}
              </Badge>
            </div>
          </div>

          {/* Alert - Offer Received */}
          <Alert className="mb-6 border-accent bg-accent/5">
            <CheckCircle className="h-4 w-4 text-accent" />
            <AlertDescription>
              <span className="font-bold">Offre reçue de {offer.bankName}</span> • Référence:{" "}
              <span className="font-mono text-sm">{offer.id}</span>
            </AlertDescription>
          </Alert>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Offer Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Offer Header Card */}
              <Card className="border-accent/50 bg-gradient-to-br from-accent/5 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-accent/20 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Meilleure Offre de Change</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Vous avez reçu une offre optimale de{" "}
                        <span className="font-bold text-foreground">{offer.bankName}</span> pour votre opération de
                        rapatriement d'export.
                      </p>
                      <div className="mt-4 flex gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground">Reçue le</p>
                          <p className="font-bold">{new Date(offer.timestamp).toLocaleString("fr-FR")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Transaction</p>
                          <p className="font-mono text-xs font-bold">{offer.transactionRef}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Détails Financiers de l'Opération</CardTitle>
                  <CardDescription>Montants, taux et commissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Original Amount */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Montant Initial en Devise Étrangère</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold">
                        {offer.currency}
                        {offer.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground text-right">Devise Source</p>
                    </div>
                  </div>

                  {/* Exchange Rate & Bank */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-2">Taux de Change Appliqué</p>
                      <p className="text-2xl font-bold text-primary">{offer.rate}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        1 {offer.currency} = {offer.rate} MAD
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Banque Gagnante</p>
                      <p className="text-lg font-bold">{offer.bankName}</p>
                      <Badge className="mt-2 bg-green-500/20 text-green-700 border-green-500/20">Taux Optimal</Badge>
                    </div>
                  </div>

                  {/* Converted Amount */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Montant Convertis en MAD</p>
                    <p className="text-2xl font-bold">MAD {convertedAmount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Avant déduction de commission</p>
                  </div>

                  {/* Commission Breakdown */}
                  <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Commission DIRECT DEVISE</p>
                        <p className="text-xl font-bold text-orange-600">- MAD {offer.commission.toLocaleString()}</p>
                      </div>
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                        {commissionPercentage}%
                      </Badge>
                    </div>
                  </div>

                  {/* Final Net Amount - Highlighted */}
                  <div className="p-4 bg-green-500/10 rounded-lg border-2 border-green-500/40">
                    <p className="text-xs text-muted-foreground mb-2">Montant Net à Recevoir</p>
                    <p className="text-3xl font-bold text-green-700">MAD {netAmount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Sera viré sur votre compte</p>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Canaux de Communication</CardTitle>
                  <CardDescription>Offre transmise via</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <Mail className="w-5 h-5 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-xs text-muted-foreground mt-1">Reçu ✓</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <MessageCircle className="w-5 h-5 mx-auto mb-2 text-green-600" />
                      <p className="text-sm font-medium">WhatsApp</p>
                      <p className="text-xs text-muted-foreground mt-1">Reçu ✓</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <Smartphone className="w-5 h-5 mx-auto mb-2 text-purple-600" />
                      <p className="text-sm font-medium">Plateforme</p>
                      <p className="text-xs text-muted-foreground mt-1">Affichée ✓</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Execution Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Détails d'Exécution</CardTitle>
                  <CardDescription>Chronologie et informations bancaires</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Délai de Virement</p>
                      <p className="font-bold">{offer.executionTime}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Type d'Opération</p>
                      <p className="font-bold">Rapatriement Export</p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Numéro de Suivi SWIFT</p>
                    <p className="font-mono text-sm font-bold">SWIFT-DD-{offer.id.substring(0, 8)}-2025</p>
                  </div>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Commentaires ou Instructions (Facultatif)</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={acceptOfferAction}>
                    <input type="hidden" name="bidId" value={offer.id} />
                    <Textarea name="comments" placeholder="Ajoutez des instructions spéciales, commentaires ou notes importantes..." className="min-h-24 resize-none" />
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Summary & Actions */}
            <div className="space-y-4">
              {/* Sticky Summary Card */}
              <Card className="border-accent/50 sticky top-8 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Résumé d'Opération</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 pb-4 border-b border-border/50">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Client / Société</span>
                      <span className="text-sm font-bold text-right">{offer.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Montant Brut</span>
                      <span className="text-sm font-bold">
                        {offer.currency} {offer.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Taux Appliqué</span>
                      <span className="text-sm font-bold text-accent">{offer.rate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Commission</span>
                      <span className="text-sm font-bold">- MAD {offer.commission.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-end">
                    <span className="text-sm font-bold">À Recevoir</span>
                    <span className="text-xl font-bold text-green-700">MAD {netAmount.toLocaleString()}</span>
                  </div>

                  <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                    <p className="mb-1">
                      <span className="font-bold">Délai:</span> {offer.executionTime}
                    </p>
                    <p>
                      <span className="font-bold">Banque:</span> {offer.bankName}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <form action={acceptOfferAction}>
                  <input type="hidden" name="bidId" value={offer.id} />
                  <Button className="w-full h-12 text-base" type="submit">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Valider l'Offre
                  </Button>
                </form>

                <form action={rejectOfferAction}>
                  <input type="hidden" name="bidId" value={offer.id} />
                  <Button variant="outline" className="w-full h-12 text-base bg-transparent" type="submit">
                    <Send className="w-4 h-4 mr-2" />
                    Refuser / Renégocier
                  </Button>
                </form>
              </div>

              {/* Info Box */}
              <Card className="bg-muted/40">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    En validant cette offre, vous confirmez l'autorisation de procéder au change et au virement sur
                    votre compte auprès de <span className="font-bold">{offer.bankName}</span>. L'opération sera
                    exécutée dans le délai annoncé.
                  </p>
                </CardContent>
              </Card>

              {/* Compliance Info */}
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-bold text-blue-700">Conformité IGOC:</span>
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-2">
                    <li>✓ Rapatriement respecté</li>
                    <li>✓ Délai conforme</li>
                    <li>✓ Documentation validée</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
