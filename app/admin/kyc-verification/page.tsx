import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect, revalidatePath } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import KYCExtractionView from "@/components/admin/kyc-extraction-view"
import AdminNav from "@/components/admin/admin-nav"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

async function extractAndApprove(companyId: string) {
  "use server"
  const prisma = getPrisma()
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { documents: true },
  })

  if (!company) return

  let extractedData: any = null

  // Try to extract data from documents
  try {
    const documents = company.documents.filter(d => 
      ["rc", "statuts", "ice", "patente"].includes(d.type)
    )

    if (documents.length > 0) {
      // Use internal extraction logic (simplified)
      for (const doc of documents) {
        if (!doc.contentBase64) continue

        // In production, call OCR service here
        // For now, we'll extract what we can from existing data
        if (doc.type === "rc" && company.rc) {
          extractedData = { ...extractedData, registrationNumber: company.rc }
        }
        if ((doc.type === "ice" || doc.type === "patente") && company.ice) {
          extractedData = { ...extractedData, taxId: company.ice }
        }
      }
    }
  } catch (error) {
    // Silently continue
  }

  // Update company
  if (extractedData?.registrationNumber || extractedData?.taxId) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        rc: extractedData.registrationNumber || company.rc,
        ice: extractedData.taxId || company.ice,
      },
    })
  }

  // Update or create KYC profile
  const kycProfile = await prisma.kycProfile.findUnique({ where: { companyId } })
  const profileData = extractedData ? {
    legalName: extractedData.legalName || company.name,
    registrationNumber: extractedData.registrationNumber || company.rc,
    taxId: extractedData.taxId || company.ice,
    headOfficeAddress: extractedData.address,
    operationalCity: extractedData.city,
    ...(kycProfile?.profileData as any || {}),
  } : (kycProfile?.profileData as any || {})

  if (kycProfile) {
    await prisma.kycProfile.update({
      where: { companyId },
      data: {
        complianceStatus: "approved",
        lastReviewDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        profileData: profileData as any,
      },
    })
  } else {
    await prisma.kycProfile.create({
      data: {
        companyId,
        complianceStatus: "approved",
        lastReviewDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        profileData: profileData as any,
      },
    })
  }

  revalidatePath("/admin/kyc-verification")
}

async function approveAction(companyId: string) {
  "use server"
  await extractAndApprove(companyId)
}

async function rejectAction(companyId: string, reason: string) {
  "use server"
  const prisma = getPrisma()
  await prisma.kycProfile.update({ where: { companyId }, data: { complianceStatus: "rejected" } })
  revalidatePath("/admin/kyc-verification")
}

export default async function AdminKycVerificationPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") redirect("/admin/login")
  const prisma = getPrisma()
  const profiles = await prisma.kycProfile.findMany({
    where: { complianceStatus: { in: ["pending", "reviewing"] } },
    include: { company: { include: { documents: true } } },
    orderBy: { createdAt: "desc" }
  })

  const admin = (session as any).user

  return (
    <div className="min-h-screen bg-background">
      <AdminNav admin={admin} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Vérification KYC</h1>
            <p className="text-muted-foreground">Soumissions en attente d'approbation</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/account-approval">
                Approbation Comptes
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {profiles.length === 0 ? (
          <Alert>
            <AlertDescription>Aucune soumission en attente</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profiles.map(p => {
              const c = p.company
              const docs = c?.documents || []
              const missing = ["rc","ice","patente","identity","ubo","activity"].filter(t => !docs.some(d => d.type === t))
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{c?.name || "Entreprise"}</CardTitle>
                        <CardDescription>Complétude: {Math.round(((6 - missing.length)/6)*100)}%</CardDescription>
                      </div>
                      <Badge className="bg-amber-600">{p.complianceStatus.toUpperCase()}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Extraction View */}
                    <KYCExtractionView companyId={c!.id} documents={docs} />

                    <div className="space-y-2">
                      {docs.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="text-sm font-medium">{d.fileName}</p>
                            <p className="text-xs text-muted-foreground">{d.type.toUpperCase()}</p>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <a href={`/api/data/documents?id=${d.id}`} target="_blank" rel="noreferrer">Voir</a>
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <form action={approveAction.bind(null, c!.id)}>
                        <Button type="submit" className="w-full" variant="default">Approuver</Button>
                      </form>
                      <form action={rejectAction.bind(null, c!.id, "Non conforme")}>
                        <Button type="submit" className="w-full" variant="destructive">Rejeter</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
