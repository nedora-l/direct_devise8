import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import PMENav from "@/components/pme/pme-nav"
import Link from "next/link"

function formatAmount(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export default async function UploadSwiftPage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).user || (session as any).user.role !== "pme") {
    redirect("/pme/login")
  }

  const prisma = getPrisma()

  const userId = (session as any).user.id as string
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
  if (!user || !user.company) {
    redirect("/pme/login")
  }

  const companyId = user.company.id
  const kyc = await prisma.kycProfile.findUnique({ where: { companyId } })
  if (!kyc || kyc.complianceStatus !== "approved") {
    redirect("/pme/kyc-waiting")
  }

  const lastSwift = await prisma.swift.findFirst({ where: { companyId }, orderBy: { createdAt: "desc" } })

  const hasApprovedSwift = !!lastSwift && lastSwift.adminStatus === "approved"
  const isPending = !!lastSwift && lastSwift.adminStatus === "pending"
  const isRejected = !!lastSwift && lastSwift.adminStatus === "rejected"

  const amount = lastSwift ? Number(lastSwift.amount || 0) : 0
  const currency = lastSwift ? String(lastSwift.currency || "") : ""
  const ref = lastSwift ? String(lastSwift.reference || "") : ""

  const igoc30 = Math.round(amount * 0.3)
  const full100 = Math.round(amount)

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: user.name || "", email: user.email, companyName: user.company.name, role: "pme" }} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Déposer et Valider SWIFT</h1>
            <p className="text-muted-foreground">Statut KYC: Approuvé • Entreprise: {user.company.name}</p>
          </div>

          {!lastSwift && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Alert className="border-amber-500 bg-amber-500/5">
                  <AlertDescription className="text-amber-700">
                    Aucun SWIFT trouvé. Déposez votre document via l’espace PME, puis revenez après validation admin.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-center gap-3">
                  <Button asChild>
                    <Link href="/pme/dashboard">Retour Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {lastSwift && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Dernier SWIFT</CardTitle>
                <CardDescription>Référence: {ref}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="text-2xl font-bold">{formatAmount(amount)} {currency.toUpperCase()}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Statut Admin</p>
                    <Badge className={hasApprovedSwift ? "bg-green-600" : isRejected ? "bg-red-600" : "bg-amber-600"}>
                      {hasApprovedSwift ? "Validé" : isRejected ? "Rejeté" : "En attente"}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-sm">{new Date(lastSwift.createdAt).toISOString().slice(0,10)}</p>
                  </div>
                </div>

                {isPending && (
                  <Alert className="border-amber-500 bg-amber-500/5">
                    <AlertDescription className="text-amber-700">
                      Document en attente de validation administrateur.
                    </AlertDescription>
                  </Alert>
                )}

                {isRejected && (
                  <Alert className="border-red-600 bg-red-600/5">
                    <AlertDescription className="text-red-700">
                      Rejeté: {lastSwift.rejectionReason || "Motif non communiqué"}
                    </AlertDescription>
                  </Alert>
                )}

                {hasApprovedSwift && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        className="w-full"
                        size="lg"
                        asChild
                      >
                        <Link href={`/pme/create-auction?ref=${encodeURIComponent(ref)}&currency=${encodeURIComponent(currency)}&mode=IGOC_30&amount=${igoc30}`}>
                          Créer une Enchère (30%)
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        size="lg"
                        asChild
                      >
                        <Link href={`/pme/create-auction?ref=${encodeURIComponent(ref)}&currency=${encodeURIComponent(currency)}&mode=FULL_100&amount=${full100}`}>
                          Créer une Enchère (100%)
                        </Link>
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/pme/dashboard">Retour Dashboard</Link>
                    </Button>
                  </div>
                )}
                
                {!hasApprovedSwift && (
                  <div className="flex justify-center">
                    <Button variant="outline" asChild>
                      <Link href="/pme/dashboard">Retour Dashboard</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
