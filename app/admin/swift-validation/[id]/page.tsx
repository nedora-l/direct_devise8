import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import AdminNav from "@/components/admin/admin-nav"
import { ArrowLeft, CheckCircle2, XCircle, FileText, AlertTriangle, AlertCircle } from "lucide-react"
import { parseSWIFT } from "@/lib/swift-parser"
import SwiftAnalysisView from "@/components/admin/swift-analysis-view"

export const dynamic = "force-dynamic"

async function approveSwiftAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") {
    redirect("/admin/login")
  }

  const prisma = getPrisma()
  const swiftId = formData.get("swiftId") as string
  
  if (!swiftId) {
    redirect("/admin/swift-validation")
  }
  
  try {
    await prisma.swift.update({
      where: { id: swiftId },
      data: {
        adminStatus: "approved",
        validated: true,
        validatedAt: new Date(),
      },
    })
    revalidatePath("/admin/swift-validation")
    revalidatePath(`/admin/swift-validation/${swiftId}`)
  } catch (error) {
    console.error("[approve-swift] Error:", error)
    throw error // Let Next.js handle the error
  }
  
  redirect("/admin/swift-validation?approved=true")
}

async function rejectSwiftAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") {
    redirect("/admin/login")
  }

  const prisma = getPrisma()
  const swiftId = formData.get("swiftId") as string
  const reason = formData.get("reason") as string || "Non conforme"
  
  if (!swiftId) {
    redirect("/admin/swift-validation")
  }
  
  try {
    await prisma.swift.update({
      where: { id: swiftId },
      data: {
        adminStatus: "rejected",
        rejectionReason: reason,
        validated: false,
      },
    })
    revalidatePath("/admin/swift-validation")
    revalidatePath(`/admin/swift-validation/${swiftId}`)
  } catch (error) {
    console.error("[reject-swift] Error:", error)
    throw error // Let Next.js handle the error
  }
  
  redirect("/admin/swift-validation?rejected=true")
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export default async function AdminSwiftDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") redirect("/admin/login")
  
  const prisma = getPrisma()
  const admin = (session as any).user

  // Handle Next.js 15+ async params
  const resolvedParams = await Promise.resolve(params)
  const swiftId = resolvedParams.id

  if (!swiftId) {
    redirect("/admin/swift-validation")
  }

  const swift = await prisma.swift.findUnique({
    where: { id: swiftId },
    include: {
      company: {
        include: {
          kyc: true,
          users: { take: 1 },
        },
      },
    },
  })

  if (!swift) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav admin={admin} />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>SWIFT non trouvé</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/admin/swift-validation">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
        </main>
      </div>
    )
  }

  const parsedData = swift.parsedJson as any
  const rawContent = parsedData?.rawContent || JSON.stringify(parsedData)
  const validation = parseSWIFT(rawContent)

  // Fetch source document if available for preview/download
  let sourceDocument: { id: string; fileName: string } | null = null
  if (parsedData?.sourceDocument) {
    try {
      const doc = await prisma.document.findUnique({
        where: { id: parsedData.sourceDocument },
        select: { id: true, fileName: true },
      })
      if (doc) sourceDocument = doc
    } catch (e) {
      console.warn("[swift-validation] Unable to load source document", e)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav admin={admin} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Validation SWIFT</h1>
            <p className="text-muted-foreground">Référence: {swift.reference}</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/swift-validation">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/dashboard">
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* SWIFT Details */}
            <Card>
              <CardHeader>
                <CardTitle>Détails du SWIFT</CardTitle>
                <CardDescription>Entreprise: {swift.company?.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="text-lg font-bold">{fmt(Number(swift.amount || 0))} {String(swift.currency || "").toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-lg font-bold">{new Date(swift.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut SWIFT</p>
                    <Badge className={swift.adminStatus === "pending" ? "bg-amber-600" : swift.adminStatus === "approved" ? "bg-green-600" : "bg-red-600"}>
                      {swift.adminStatus === "pending" ? "En attente" : swift.adminStatus === "approved" ? "Approuvé" : "Rejeté"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut KYC</p>
                    <Badge className={swift.company?.kyc?.complianceStatus === "approved" ? "bg-green-600" : "bg-amber-600"}>
                      {swift.company?.kyc?.complianceStatus === "approved" ? "Validé" : "En attente"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">Données extraites</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {parsedData?.reference && (
                      <div>
                        <span className="text-muted-foreground">Référence:</span> {parsedData.reference}
                      </div>
                    )}
                    {parsedData?.beneficiaryName && (
                      <div>
                        <span className="text-muted-foreground">Bénéficiaire:</span> {parsedData.beneficiaryName}
                      </div>
                    )}
                    {parsedData?.senderName && (
                      <div>
                        <span className="text-muted-foreground">Expéditeur:</span> {parsedData.senderName}
                      </div>
                    )}
                    {parsedData?.transactionType && (
                      <div>
                        <span className="text-muted-foreground">Type:</span> {parsedData.transactionType}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">Contenu brut</h3>
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                    {rawContent || "Aucun contenu disponible"}
                  </pre>
                </div>

                {sourceDocument && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Document source
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {sourceDocument.fileName || "Document SWIFT"}
                      </p>
                      <div className="flex gap-3">
                        <Button asChild variant="outline">
                          <Link href={`/api/data/documents?id=${sourceDocument.id}`} target="_blank">
                            Voir / Télécharger
                          </Link>
                        </Button>
                      </div>
                      <Alert className="border-amber-500 bg-amber-500/10">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          Vérifiez visuellement le PDF d’origine avant d’approuver ou de rejeter.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Validation Errors */}
            {!validation.valid && validation.errors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Erreurs de validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validation.errors.map((error, i) => (
                      <li key={i} className="text-destructive">{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Analyse complète avec rapports */}
            <SwiftAnalysisView swiftId={swift.id} />
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">

            {/* Actions */}
            <Card className="border-2 border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Actions de validation
                </CardTitle>
                <CardDescription>
                  Après validation, le SWIFT sera disponible pour les enchères
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-sm text-blue-800">
                    💡 Vérifiez l'analyse complète ci-dessous avant de valider
                  </AlertDescription>
                </Alert>
                <form action={approveSwiftAction}>
                  <input type="hidden" name="swiftId" value={swift.id} />
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" size="lg">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Approuver le SWIFT
                  </Button>
                </form>
                <form action={rejectSwiftAction}>
                  <input type="hidden" name="swiftId" value={swift.id} />
                  <input type="hidden" name="reason" value="Non conforme aux exigences" />
                  <Button type="submit" className="w-full" variant="destructive" size="lg">
                    <XCircle className="mr-2 h-5 w-5" />
                    Rejeter le SWIFT
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

