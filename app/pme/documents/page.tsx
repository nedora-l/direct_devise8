import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PMENav from "@/components/pme/pme-nav"
import { FileText, Download, CheckCircle2, AlertCircle, Eye } from 'lucide-react'
import { documentTemplates, documentTitles, documentDescriptions, DocumentType, CompanyData } from '@/lib/document-templates'

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')
  const kycProfile = await prisma.kycProfile.findUnique({ where: { companyId: userRow.company.id } })
  if (!kycProfile || kycProfile.complianceStatus !== 'approved') redirect('/pme/kyc-waiting')
  const kycData = {
    company: userRow.company.name,
    registrationNumber: userRow.company.registrationNumber || '—',
    address: userRow.company.address || '—',
    legalRepresentative: userRow.company.legalRepresentative || '—',
    representativeTitle: userRow.company.representativeTitle || 'Directeur Général',
    city: userRow.company.city || 'Casablanca'
  }
  async function previewAction(formData: FormData) {
    "use server"
    const docType = String(formData.get('docType') || '') as DocumentType
    redirect(`/pme/documents/preview?doc=${encodeURIComponent(docType)}`)
  }

  async function downloadAction(formData: FormData) {
    "use server"
    const docType = String(formData.get('docType') || '') as DocumentType
    redirect(`/pme/documents/download?doc=${encodeURIComponent(docType)}`)
  }

  const generateDocument = (docType: DocumentType) => {
    const companyData: CompanyData = {
      company: kycData.company,
      registrationNumber: kycData.registrationNumber,
      address: kycData.address,
      representative: kycData.legalRepresentative,
      representativeTitle: kycData.representativeTitle,
      city: kycData.city
    }
    return documentTemplates[docType](companyData)
  }

  const handlePreview = (_docType: DocumentType) => {}

  const handleDownload = (_docType: DocumentType) => {}

  const userObj = { name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: 'pme' }

  const documents: DocumentType[] = ['saasContract', 'eligibilityDeclaration', 'changeMandate', 'confidentialityAgreement']

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={userObj} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Documents Légaux</h1>
            <p className="text-muted-foreground">Générez et téléchargez vos documents contractuels conformes IGOC 2024</p>
          </div>

          <Alert className="border-blue-500 bg-blue-500/5">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-600">
              Les documents sont pré-remplis avec vos informations KYC. Veuillez les vérifier avant signature.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Liste des Documents</TabsTrigger>
              <TabsTrigger value="preview" disabled>Àperçu (via bouton)</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="grid gap-4">
                {documents.map((docType) => (
                  <Card key={docType}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 mt-1 text-primary" />
                          <div>
                            <CardTitle className="text-lg">{documentTitles[docType]}</CardTitle>
                            <CardDescription className="mt-1">
                              {documentDescriptions[docType]}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2">Requis</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <form action={previewAction}>
                          <input type="hidden" name="docType" value={docType} />
                          <Button variant="outline" size="sm" type="submit">
                            <Eye className="mr-2 h-4 w-4" />
                            Aperçu
                          </Button>
                        </form>
                        <form action={downloadAction}>
                          <input type="hidden" name="docType" value={docType} />
                          <Button size="sm" type="submit">
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert className="border-green-600 bg-green-600/5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Une fois signés, veuillez retourner ces documents à Direct Devise pour finaliser votre dossier.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Utilisez le bouton “Aperçu” pour afficher le document</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">L’aperçu s’ouvre sur une page dédiée.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
