import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Suspense } from "react"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import PMENav from "@/components/pme/pme-nav"
import { Zap, CheckCircle2, AlertTriangle, Target } from "lucide-react"
import Link from "next/link"

function fmt(n: number): string { return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n) }

export default function CreateAuctionPage() {
  return (
    <Suspense fallback={null}>
      <CreateAuctionPageInner />
    </Suspense>
  )
}

async function createAuctionAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "pme") {
    redirect("/pme/login")
  }
  const prisma = getPrisma()
  const title = String(formData.get("title") || "").trim()
  const targetCurrency = String(formData.get("targetCurrency") || "MAD")
  const duration = Number(formData.get("duration") || 24)
  const companyId = String(formData.get("companyId") || "")
  const createdBy = String(formData.get("createdBy") || "")
  const swiftReference = String(formData.get("swiftReference") || "")
  const splitMode = String(formData.get("splitMode") || "IGOC_30") as "IGOC_30" | "FULL_100"
  const description = String(formData.get("description") || "") || null

  if (swiftReference === "new") {
    redirect("/pme/upload-swift")
  }

  if (!swiftReference) {
    throw new Error("Référence SWIFT manquante")
  }

  const swift = await prisma.swift.findUnique({ where: { reference: swiftReference } })
  if (!swift || swift.companyId !== companyId || swift.adminStatus !== "approved" || !swift.validated) {
    throw new Error("SWIFT non valide ou non approuvé")
  }

  // Vérifier l'usage unique du SWIFT
  const existingAuction = await prisma.auction.findFirst({
    where: { swiftReference },
    select: { id: true },
  })
  if (existingAuction) {
    throw new Error("Ce SWIFT est déjà utilisé pour une enchère")
  }

  const amount =
    splitMode === "IGOC_30"
      ? Math.round(Number(swift.amount || 0) * 0.3 * 100) / 100
      : Number(swift.amount || 0)

  await prisma.auction.create({
    data: {
      companyId,
      title: title || `Enchère ${swift.reference}`,
      amount,
      sourceCurrency: swift.currency,
      targetCurrency,
      description,
      duration,
      status: "active",
      createdBy,
      endsAt: new Date(Date.now() + duration * 3600 * 1000),
      swiftReference,
    },
  })
  revalidatePath("/pme/active-auctions")
  redirect("/pme/active-auctions")
}
async function CreateAuctionPageInner() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')
  // Récupérer tous les SWIFT de la company (pour debug)
  const allSwifts = await prisma.swift.findMany({
    where: { companyId: userRow.company.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      adminStatus: true,
      validated: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
  })
  
  console.log(`[create-auction] Found ${allSwifts.length} SWIFT(s) for company ${userRow.company.id}:`, 
    allSwifts.map(s => ({ ref: s.reference, status: s.adminStatus, validated: s.validated }))
  )
  
  // Filtrer uniquement les SWIFT approuvés et validés
  const swifts = allSwifts.filter(s => s.adminStatus === "approved" && s.validated === true)
  const usedRefs = await prisma.auction.findMany({
    where: { swiftReference: { in: swifts.map((s) => s.reference) } },
    select: { swiftReference: true },
  })
  const usedSet = new Set(usedRefs.map((r) => r.swiftReference).filter(Boolean) as string[])
  const availableSwifts = swifts.filter((s) => !usedSet.has(s.reference))

  if (availableSwifts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 space-y-3 text-center">
              <p className="text-muted-foreground">Aucun SWIFT validé disponible pour créer une enchère.</p>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <a href="/pme/upload-swift">Déposer un SWIFT</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/pme/dashboard">Retour Dashboard</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const defaultSwift = availableSwifts[0]

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Créer une Enchère</h1>
            <p className="text-muted-foreground">Lancez une enchère pour obtenir le meilleur taux de change</p>
          </div>

          {defaultSwift && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Document SWIFT Validé</p>
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>
                        Plafond IGOC (30%):{" "}
                        <span className="font-semibold text-foreground">
                          {fmt(Math.round(Number(defaultSwift.amount || 0) * 0.3))} {defaultSwift.currency}
                        </span>
                      </p>
                      <p className="mt-1">
                        Conversion possible (100%):{" "}
                        <span className="font-semibold text-foreground">
                          {fmt(Math.round(Number(defaultSwift.amount || 0)))} {defaultSwift.currency}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Référence: {defaultSwift.reference}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form action={createAuctionAction}>
            <Card>
              <CardHeader>
                <CardTitle>Détails de l'Enchère</CardTitle>
                <CardDescription>Remplissez les informations pour votre opération de change</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <input type="hidden" name="companyId" value={userRow.company.id} />
                <input type="hidden" name="createdBy" value={userRow.id} />

                <div className="space-y-2">
                  <Label htmlFor="swiftReference">Choisir un SWIFT validé</Label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <Select name="swiftReference" defaultValue={defaultSwift.reference}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un SWIFT" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSwifts.map((s) => (
                            <SelectItem key={s.id} value={s.reference}>
                              {s.reference} — {fmt(Number(s.amount || 0))} {s.currency}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">Nouveau SWIFT (redirige vers dépôt)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Seuls les SWIFT validés et non utilisés sont listés.
                      </p>
                    </div>
                    <Button asChild variant="outline" type="button" className="md:w-56">
                      <Link href={`/pme/swift-strategy?swiftId=${defaultSwift.id}`}>
                        <Target className="mr-2 h-4 w-4" />
                        Spotting / Taux désiré
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mode de conversion</Label>
                  <RadioGroup name="splitMode" defaultValue="IGOC_30" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer">
                      <RadioGroupItem value="IGOC_30" id="igoc30" />
                      <div className="text-sm">
                        <p className="font-medium">IGOC 30%</p>
                        <p className="text-muted-foreground">Plafond réglementaire</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer">
                      <RadioGroupItem value="FULL_100" id="full100" />
                      <div className="text-sm">
                        <p className="font-medium">Conversion 100%</p>
                        <p className="text-muted-foreground">Sous réserve de conformité</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titre de l'enchère *</Label>
                  <Input id="title" name="title" placeholder="Ex: Paiement fournisseur Chine" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Montant (calculé côté serveur)</Label>
                    <div className="text-sm p-2 border rounded-md bg-muted">
                      <span className="font-semibold">Basé sur le SWIFT sélectionné et le split choisi (70/30 ou 100%)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Le montant final est recalculé côté serveur.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Devise Source *</Label>
                    <Select value={defaultSwift.currency} disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={defaultSwift.currency}>{defaultSwift.currency}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Basée sur la devise du SWIFT, non modifiable</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetCurrency">Devise Cible *</Label>
                    <Select name="targetCurrency" defaultValue="MAD">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAD">MAD - Dirham Marocain</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - Dollar US</SelectItem>
                        <SelectItem value="GBP">GBP - Livre Sterling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durée (heures) *</Label>
                    <Select name="duration" defaultValue="24">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 heures</SelectItem>
                        <SelectItem value="6">6 heures</SelectItem>
                        <SelectItem value="12">12 heures</SelectItem>
                        <SelectItem value="24">24 heures</SelectItem>
                        <SelectItem value="48">48 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea id="description" name="description" placeholder="Détails supplémentaires sur l'opération..." rows={4} />
                </div>

                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    Les banques verront votre enchère et pourront soumettre leurs offres en temps réel.
                  </AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Un SWIFT ne peut être utilisé qu'une seule fois. Après création, il sera marqué comme consommé.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="mt-6 flex gap-4">
              <Button type="submit" className="flex-1" size="lg">
                <Zap className="mr-2 h-4 w-4" />
                Créer l'Enchère
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
              >
                <a href="/pme/active-auctions">Annuler</a>
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
