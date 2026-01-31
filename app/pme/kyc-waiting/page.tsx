import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import PMENav from "@/components/pme/pme-nav"
import { CheckCircle2, AlertCircle, Loader2, Clock, XCircle, FileText, Shield } from "lucide-react"

export default async function KYCWaitingPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "pme") redirect("/pme/login")
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect("/pme/login")
  const kyc = await prisma.kycProfile.findUnique({ where: { companyId: userRow.company.id } })
  const docs = await prisma.document.findMany({ where: { companyId: userRow.company.id } })
  const sixReq = ["rc", "ice", "patente", "identity", "ubo", "activity"]
  const uploaded = new Set(docs.map(d => d.type))
  const missingDocs = sixReq.filter(t => !uploaded.has(t)).map(t => {
    switch (t) {
      case "rc":
        return "Registre de Commerce (RC)"
      case "ice":
        return "Identifiant Commun (ICE)"
      case "patente":
        return "Patente Professionnelle"
      case "identity":
        return "Pièce d'Identité Dirigeant"
      case "ubo":
        return "Déclaration UBO"
      default:
        return "Justificatif d'Activité"
    }
  })
  const completeness = Math.round(((sixReq.length - missingDocs.length) / sixReq.length) * 100)
  const kycStatus: "pending" | "reviewing" | "approved" | "rejected" = (kyc?.complianceStatus as any) || "reviewing"

  const AnimatedLoader = () => (
    <div className="relative">
      <div className="absolute inset-0 blur-2xl opacity-30">
        <div className="h-32 w-32 bg-primary rounded-full animate-pulse" />
      </div>
      <div className="relative">
        <Loader2 className="h-20 w-20 text-primary animate-spin" />
        <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary/60" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-primary/5 rounded-full mb-4">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Validation de votre KYC</h1>
            <p className="text-muted-foreground">Suivi en temps réel de votre dossier</p>
          </div>

          <Card className="border-2 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-6">
                {kycStatus === "pending" && (
                  <div className="relative">
                    <Clock className="h-16 w-16 text-amber-600 animate-pulse" />
                    <div className="absolute -inset-2 bg-amber-600/10 rounded-full animate-ping" />
                  </div>
                )}
                {kycStatus === "reviewing" && <AnimatedLoader />}
                {kycStatus === "approved" && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-600/20 rounded-full blur-xl animate-pulse" />
                    <CheckCircle2 className="relative h-20 w-20 text-green-600" />
                  </div>
                )}
                {kycStatus === "rejected" && (
                  <XCircle className="h-16 w-16 text-red-600" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {kycStatus === "pending" && `En attente de validation`}
                {kycStatus === "reviewing" && `Révision en cours`}
                {kycStatus === "approved" && "KYC Approuvé !"}
                {kycStatus === "rejected" && "KYC Rejeté"}
              </CardTitle>
              <CardDescription className="text-base mt-2 text-pretty">
                {kycStatus === "pending" && "Votre demande KYC est en révision. Un administrateur examinera vos documents sous peu."}
                {kycStatus === "reviewing" && "Notre équipe examine actuellement vos documents. Cela prend généralement quelques minutes."}
                {kycStatus === "approved" && "Félicitations ! Vous pouvez maintenant continuer avec l'upload de votre document SWIFT."}
                {kycStatus === "rejected" && "Veuillez corriger les problèmes identifiés et soumettre à nouveau votre dossier."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Complétude du dossier</span>
                  <span className="text-sm font-bold text-primary">{completeness}%</span>
                </div>
                <Progress value={completeness} className="h-2" />
              </div>

              <div className="flex justify-center">
                <Badge className={`px-6 py-2 text-base ${
                  kycStatus === "pending" ? "bg-amber-600" :
                  kycStatus === "reviewing" ? "bg-blue-600" :
                  kycStatus === "approved" ? "bg-green-600" :
                  "bg-red-600"
                }`}>
                  {kycStatus === "pending" && "EN ATTENTE"}
                  {kycStatus === "reviewing" && "EN RÉVISION"}
                  {kycStatus === "approved" && "✓ APPROUVÉ"}
                  {kycStatus === "rejected" && "✗ REJETÉ"}
                </Badge>
              </div>

              {kycStatus === "reviewing" && (
                <Alert className="border-blue-600 bg-blue-600/5">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-600">
                    Analyse automatique en cours. Les documents seront validés par un administrateur dans les prochaines minutes.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {missingDocs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Documents Manquants ({missingDocs.length})
                </CardTitle>
                <CardDescription>Ces documents sont requis pour compléter votre dossier</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {missingDocs.map((doc, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm p-2 border rounded-lg bg-amber-600/5">
                      <span className="h-2 w-2 bg-amber-600 rounded-full" />
                      <span className="font-medium">{doc}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          

          <div className="flex flex-col gap-3">
            {kycStatus === "approved" ? (
              <Button asChild className="w-full" size="lg"><a href="/pme/upload-swift">Continuer → Upload Document SWIFT</a></Button>
            ) : (
              <div className="flex gap-3">
                <Button asChild variant="outline" className="flex-1"><a href="/pme/kyc-onboarding">Modifier le KYC</a></Button>
                <Button asChild variant="outline" className="flex-1"><a href="/pme/dashboard">Tableau de Bord</a></Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
