import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect, revalidatePath } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import AdminNav from "@/components/admin/admin-nav"
import KYCExtractionView from "@/components/admin/kyc-extraction-view"
import ConvertSwiftButton from "@/components/admin/convert-swift-button"
import { ArrowLeft, FileText, CheckCircle2, XCircle, Eye } from "lucide-react"

export const dynamic = "force-dynamic"

async function approveAccountAction(companyId: string) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") {
    redirect("/admin/login")
  }

  const prisma = getPrisma()
  
  try {
    // Extract and update KYC
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { documents: true, kyc: true },
    })

    if (!company) {
      redirect("/admin/account-approval?error=company_not_found")
    }

    // Update KYC to approved
    if (company.kyc) {
      await prisma.kycProfile.update({
        where: { companyId },
        data: {
          complianceStatus: "approved",
          lastReviewDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })
    } else {
      await prisma.kycProfile.create({
        data: {
          companyId,
          complianceStatus: "approved",
          lastReviewDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })
    }

    revalidatePath("/admin/account-approval")
    revalidatePath("/admin/kyc-verification")
    redirect("/admin/account-approval?approved=true")
  } catch (error) {
    console.error("[approve-account] Error:", error)
    redirect("/admin/account-approval?error=approval_failed")
  }
}

async function rejectAccountAction(companyId: string, reason: string) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") {
    redirect("/admin/login")
  }

  const prisma = getPrisma()
  
  try {
    const kyc = await prisma.kycProfile.findUnique({
      where: { companyId },
    })

    if (kyc) {
      await prisma.kycProfile.update({
        where: { companyId },
        data: {
          complianceStatus: "rejected",
        },
      })
    } else {
      // Create rejected KYC if doesn't exist
      await prisma.kycProfile.create({
        data: {
          companyId,
          complianceStatus: "rejected",
        },
      })
    }

    revalidatePath("/admin/account-approval")
    redirect("/admin/account-approval?rejected=true")
  } catch (error) {
    console.error("[reject-account] Error:", error)
    redirect("/admin/account-approval?error=rejection_failed")
  }
}

export default async function AdminAccountApprovalPage({ searchParams }: { searchParams: Promise<{ approved?: string; rejected?: string; error?: string }> | { approved?: string; rejected?: string; error?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") redirect("/admin/login")
  
  const prisma = getPrisma()
  const admin = (session as any).user
  
  // Handle async searchParams for Next.js 15+
  const resolvedParams = await Promise.resolve(searchParams)
  const showApproved = resolvedParams.approved === "true"
  const showRejected = resolvedParams.rejected === "true"
  const showError = resolvedParams.error !== undefined

  // Get companies with pending KYC OR companies that have pending swifts
  // This includes companies that just registered and need approval
  // Récupérer TOUTES les companies qui ont besoin d'approbation
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        // Companies with KYC in pending/reviewing status (nouveaux comptes)
        {
          kyc: {
            complianceStatus: { in: ["pending", "reviewing"] },
          },
        },
        // Companies without KYC profile at all (nouveaux comptes sans KYC créé)
        {
          kyc: null,
        },
        // Companies with pending SWIFT (même si KYC approuvé, besoin validation SWIFT)
        {
          swifts: {
            some: {
              adminStatus: "pending",
            },
          },
        },
      ],
    },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        // Include contentBase64 to check if documents have content
        select: {
          id: true,
          type: true,
          fileName: true,
          mimeType: true,
          contentBase64: true,
          createdAt: true,
        },
      },
      kyc: true,
      swifts: {
        where: { adminStatus: "pending" },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      users: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })
  const allCompanies = await prisma.company.findMany({
    include: {
      users: true,
      kyc: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-background">
      <AdminNav admin={admin} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Approbation de Comptes PME</h1>
            <p className="text-muted-foreground">Validation complète : Documents KYC + SWIFT</p>
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
              ✅ Compte approuvé avec succès !
            </AlertDescription>
          </Alert>
        )}

        {showRejected && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertDescription className="text-red-800">
              ❌ Compte rejeté.
            </AlertDescription>
          </Alert>
        )}

        {showError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Erreur lors de l'opération. Veuillez réessayer.
            </AlertDescription>
          </Alert>
        )}

        {companies.length === 0 ? (
          <Alert>
            <AlertDescription>
              Aucun compte en attente d'approbation
              <div className="mt-2 text-xs text-muted-foreground">
                Vérifiez les logs serveur pour voir combien de companies ont été trouvées.
                <br />
                Si le compte a été créé aujourd'hui, vérifiez qu'il a bien un KYC avec status "pending".
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {companies.map((company) => {
              const docs = company.documents || []
              const swifts = company.swifts || []
              const kyc = company.kyc
              const user = company.users[0]
              // Required documents: rc, statuts, ice, patente, identity, ubo, activity (7 total, but statuts is optional for some)
              const requiredTypes = ["rc", "ice", "patente", "identity", "ubo", "activity"]
              // Check for missing documents, also check filename-based detection
              const missingDocs = requiredTypes.filter((t) => {
                const hasExactType = docs.some((d) => d.type === t)
                if (hasExactType) return false
                
                // Also check filename-based detection
                if (t === "ice") {
                  return !docs.some((d) => d.fileName.toLowerCase().includes("ice"))
                }
                if (t === "patente") {
                  return !docs.some((d) => d.fileName.toLowerCase().includes("patente"))
                }
                return true
              })
              const completeness = Math.round(((requiredTypes.length - missingDocs.length) / requiredTypes.length) * 100)

              return (
                <Card key={company.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {company.name}
                          {kyc?.profileData && typeof kyc.profileData === "object" && (kyc.profileData as any).legalName && (kyc.profileData as any).legalName !== company.name && (
                            <span className="ml-2 text-sm font-normal text-amber-600">
                              (KYC: {(kyc.profileData as any).legalName})
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="space-y-1">
                          <div>Email: {user?.email || "N/A"} | Complétude: {completeness}%</div>
                          <div className="text-xs text-muted-foreground">
                            Créé le: {new Date(company.createdAt).toLocaleDateString("fr-FR", { 
                              day: "2-digit", 
                              month: "2-digit", 
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </CardDescription>
                      </div>
                      <Badge className={!kyc || kyc.complianceStatus === "pending" ? "bg-amber-600" : kyc.complianceStatus === "reviewing" ? "bg-blue-600" : "bg-green-600"}>
                        {kyc?.complianceStatus.toUpperCase() || "NOUVEAU COMPTE"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="documents" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="documents">
                          Documents ({docs.length})
                        </TabsTrigger>
                        <TabsTrigger value="swift">
                          SWIFT ({swifts.length})
                        </TabsTrigger>
                        <TabsTrigger value="extraction">
                          Extraction KYC
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="documents" className="space-y-4">
                        {docs.length === 0 ? (
                          <Alert>
                            <AlertDescription>Aucun document uploadé</AlertDescription>
                          </Alert>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {docs
                                .filter(d => d.type !== "swift" && d.type !== "swift_document") // Exclude SWIFT from document list
                                .map((doc) => {
                                  // Auto-detect type from filename if type seems wrong
                                  const fileNameLower = doc.fileName.toLowerCase()
                                  let detectedType = doc.type
                                  if (fileNameLower.includes("ice") && doc.type !== "ice") {
                                    detectedType = "ice (détecté)"
                                  } else if (fileNameLower.includes("patente") && doc.type !== "patente") {
                                    detectedType = "patente (détecté)"
                                  }
                                  
                                  return (
                                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="pt-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium">{doc.fileName}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {detectedType.toUpperCase()}
                                              {detectedType !== doc.type && (
                                                <span className="text-yellow-600 ml-1">⚠️</span>
                                              )}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                                            </p>
                                            {!doc.contentBase64 && (
                                              <Badge variant="destructive" className="mt-1 text-xs">
                                                Pas de contenu
                                              </Badge>
                                            )}
                                          </div>
                                          <Button asChild variant="outline" size="sm">
                                            <a href={`/api/data/documents?id=${doc.id}`} target="_blank" rel="noreferrer">
                                              <FileText className="h-4 w-4 mr-2" />
                                              Voir
                                            </a>
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )
                                })}
                            </div>
                            {/* Show SWIFT documents separately */}
                            {docs.some(d => d.type === "swift" || d.type === "swift_document") && (
                              <Alert className="border-blue-500 bg-blue-500/10">
                                <AlertDescription>
                                  <div className="flex items-center justify-between">
                                    <span>
                                      {docs.filter(d => d.type === "swift" || d.type === "swift_document").length} document(s) SWIFT uploadé(s) mais pas encore converti(s) en entrées SWIFT.
                                    </span>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                            {missingDocs.length > 0 && (
                              <Alert variant="destructive">
                                <AlertDescription>
                                  Documents manquants: {missingDocs.join(", ").toUpperCase()}
                                </AlertDescription>
                              </Alert>
                            )}
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="swift" className="space-y-4">
                        {/* Check for SWIFT documents that need conversion */}
                        {swifts.length === 0 && docs.some(d => d.type === "swift" || d.type === "swift_document" || d.fileName.toLowerCase().includes("swift")) && (
                          <Alert className="border-yellow-500 bg-yellow-500/10">
                            <AlertDescription>
                              <div className="flex items-center justify-between">
                                <span>Des documents SWIFT ont été uploadés mais ne sont pas encore convertis en entrées SWIFT.</span>
                                <ConvertSwiftButton companyId={company.id} />
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                        {swifts.length === 0 ? (
                          <Alert>
                            <AlertDescription>
                              Aucun SWIFT en attente pour ce compte. 
                              {kyc?.complianceStatus === "approved" && " Le compte peut être approuvé sans SWIFT initial."}
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {swifts.map((swift) => (
                              <Card key={swift.id} className="border-2">
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-base">Référence: {swift.reference}</CardTitle>
                                      <CardDescription>
                                        {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(swift.amount || 0))} {String(swift.currency || "").toUpperCase()} | {new Date(swift.createdAt).toLocaleDateString("fr-FR")}
                                      </CardDescription>
                                    </div>
                                    <Badge className="bg-amber-600">En attente</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="flex gap-3">
                                    <Button asChild variant="default" className="flex-1">
                                      <Link href={`/admin/swift-validation/${swift.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Voir détails et valider
                                      </Link>
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="extraction">
                        <KYCExtractionView companyId={company.id} documents={docs} />
                      </TabsContent>
                    </Tabs>

                    <div className="flex gap-3 mt-6 pt-6 border-t">
                      <form action={approveAccountAction.bind(null, company.id)} className="flex-1">
                        <Button type="submit" className="w-full" variant="default">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approuver le compte
                        </Button>
                      </form>
                      <form action={rejectAccountAction.bind(null, company.id, "Non conforme")} className="flex-1">
                        <Button type="submit" className="w-full" variant="destructive">
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeter
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
      <main className="container mx-auto px-4 pb-12">
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-2">Vue globale des comptes enregistrés</h2>
          <p className="text-muted-foreground mb-4">
            Liste des entreprises enregistrées dans Direct Devise (vision globale, lecture seule).
          </p>
          {allCompanies.length === 0 ? (
            <Alert>
              <AlertDescription>Aucun compte enregistré pour le moment.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {allCompanies.map((company) => {
                const primaryUser = company.users[0]
                const kyc = company.kyc
                return (
                  <Card key={company.id}>
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Email: {primaryUser?.email ?? "N/A"} • Créé le{" "}
                          {new Date(company.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        className={
                          !kyc || kyc.complianceStatus === "pending"
                            ? "bg-amber-600"
                            : kyc.complianceStatus === "reviewing"
                              ? "bg-blue-600"
                              : kyc.complianceStatus === "approved"
                                ? "bg-green-600"
                                : "bg-red-600"
                        }
                      >
                        {kyc?.complianceStatus?.toUpperCase() ?? "SANS KYC"}
                      </Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

