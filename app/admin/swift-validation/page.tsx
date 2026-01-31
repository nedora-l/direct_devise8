import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import AdminNav from "@/components/admin/admin-nav"
import { ArrowLeft, Eye } from "lucide-react"

export const dynamic = "force-dynamic"

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export default async function AdminSwiftValidationPage({ searchParams }: { searchParams: Promise<{ approved?: string; rejected?: string; error?: string }> | { approved?: string; rejected?: string; error?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).user || (session as any).user.role !== "admin") {
    redirect("/admin/login")
  }

  const prisma = getPrisma()
  const admin = (session as any).user
  
  const resolvedParams = await Promise.resolve(searchParams)
  const showApproved = resolvedParams.approved === "true"
  const showRejected = resolvedParams.rejected === "true"
  const showError = resolvedParams.error
  
  const swifts = await prisma.swift.findMany({
    where: { adminStatus: "pending" },
    include: { company: { include: { kyc: true } } },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="min-h-screen bg-background">
      <AdminNav admin={admin} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Validation SWIFT (en attente)</h1>
            <p className="text-muted-foreground">Comptes admin uniquement • {swifts.length} document{swifts.length > 1 ? "s" : ""} en attente</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour Dashboard
            </Link>
          </Button>
        </div>

        {showApproved && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <AlertDescription className="text-green-800">
              ✅ SWIFT approuvé avec succès !
            </AlertDescription>
          </Alert>
        )}

        {showRejected && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertDescription className="text-red-800">
              ❌ SWIFT rejeté.
            </AlertDescription>
          </Alert>
        )}

        {showError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              ⚠️ Erreur lors de l'opération. Veuillez réessayer.
            </AlertDescription>
          </Alert>
        )}

        {swifts.length === 0 ? (
          <Alert>
            <AlertDescription>✅ Aucun document en attente - Tous les SWIFT ont été traités !</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {swifts.map(s => (
              <Card key={s.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{s.company?.name || "Entreprise"}</CardTitle>
                      <CardDescription className="text-xs">Référence: {s.reference}</CardDescription>
                    </div>
                    <Badge className={s.company?.kyc?.complianceStatus === "approved" ? "bg-green-600" : "bg-amber-600"}>
                      {s.company?.kyc?.complianceStatus === "approved" ? "KYC Validé" : "KYC En attente"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      ⏳ Validation admin requise
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Montant</p>
                      <p className="font-semibold">{fmt(Number(s.amount || 0))} {String(s.currency || "").toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-semibold">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Statut SWIFT</p>
                      <Badge className="bg-amber-600">En attente</Badge>
                    </div>
                  </div>
                  <Button asChild className="w-full" variant="default">
                    <Link href={`/admin/swift-validation/${s.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir détails et valider
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
