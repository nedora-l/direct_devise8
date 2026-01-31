import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PMENav from "@/components/pme/pme-nav"
import KYCForm from "@/components/pme/kyc-form"
import DocumentUploader from "@/components/pme/document-uploader"
import UBOForm from "@/components/pme/ubo-form"
import KYCStatus from "@/components/pme/kyc-status"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default async function KYCOnboardingPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')
  const kyc = await prisma.kycProfile.findUnique({ where: { companyId: userRow.company.id } })
  const kycId = kyc?.id || null
  const kycStatus: "pending" | "approved" | "rejected" = (kyc?.complianceStatus as any) || 'pending'
  const activeTab = 'info'

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Vérification KYC</h1>
          <p className="text-foreground">Complétez votre profil de conformité KYB/KYC</p>
        </div>

        {kycStatus === "approved" && (
          <Alert className="mb-6 border-green-600 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
              Votre profil KYC a été approuvé. Vous pouvez maintenant effectuer vos opérations.
            </AlertDescription>
          </Alert>
        )}

        {kycStatus === "rejected" && (
          <Alert className="mb-6 border-destructive bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Votre demande KYC a été rejetée. Veuillez corriger les informations et soumettre à nouveau.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={activeTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="ubo">UBO/Bénéficiaires</TabsTrigger>
            <TabsTrigger value="status">Statut</TabsTrigger>
          </TabsList>

        <TabsContent value="info">
          <KYCForm 
            userId={userRow.id} 
            companyName={userRow.company.name} 
            isReadOnly={kycStatus === "approved"}
          />
        </TabsContent>

        <TabsContent value="documents">
          {!kycId ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Complétez d'abord vos informations générales.</AlertDescription>
            </Alert>
          ) : (
            <DocumentUploader kycId={kycId} userId={userRow.id} />
          )}
        </TabsContent>

        <TabsContent value="ubo">
          {!kycId ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Complétez d'abord vos informations générales.</AlertDescription>
            </Alert>
          ) : (
            <UBOForm kycId={kycId} userId={userRow.id} />
          )}
        </TabsContent>

        <TabsContent value="status">
          {kycId && <KYCStatus kycId={kycId} />}
        </TabsContent>

        </Tabs>
      </main>
    </div>
  )
}
