import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect, revalidatePath } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PMENav from "@/components/pme/pme-nav"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import KYCCompleteness from "@/components/pme/kyc-completeness"
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { audit } from "@/lib/audit-logger"
import { kycAgent } from "@/lib/agent-kyc"

async function uploadDocAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') return
  const prisma = getPrisma()
  const userId = (session as any).user.id as string
  const userRow = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
  if (!userRow || !userRow.company) return
  const type = String(formData.get('type')||'')
  const file = formData.get('file') as File
  if (!type || !file) return
  const ab = await file.arrayBuffer()
  const base64 = Buffer.from(new Uint8Array(ab)).toString('base64')
  await prisma.document.create({ data: { companyId: userRow.company.id, type, fileName: file.name, mimeType: file.type || 'application/octet-stream', contentBase64: base64 } })
  revalidatePath('/pme/kyc-documents')
}

  const sixRequiredDocs = [
    { type: "rc", label: "Registre de Commerce (RC)", description: "Document RC original" },
    { type: "ice", label: "Identifiant Commun d'Entreprise (ICE)", description: "Certificat ICE" },
    { type: "patente", label: "Patente Professionnelle", description: "Patente en cours de validité" },
    { type: "identity", label: "Pièce d'Identité du Responsable", description: "CIN ou Passeport" },
    { type: "ubo", label: "Déclaration UBO", description: "Bénéficiaires finaux signée" },
    { type: "activity", label: "Contrat/Justificatif d'Activité", description: "Factures, contrats ou autres preuves" },
  ]

export default async function KYCDocumentsPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')
  const docsRows = await prisma.document.findMany({ where: { companyId: userRow.company.id }, orderBy: { createdAt: 'desc' } })
  const documents = docsRows.map(d => ({ type: d.type, fileName: d.fileName }))
  const sixRequiredDocs = [
    { type: "rc", label: "Registre de Commerce (RC)", description: "Document RC original" },
    { type: "ice", label: "Identifiant Commun d'Entreprise (ICE)", description: "Certificat ICE" },
    { type: "patente", label: "Patente Professionnelle", description: "Patente en cours de validité" },
    { type: "identity", label: "Pièce d'Identité du Responsable", description: "CIN ou Passeport" },
    { type: "ubo", label: "Déclaration UBO", description: "Bénéficiaires finaux signée" },
    { type: "activity", label: "Contrat/Justificatif d'Activité", description: "Factures, contrats ou autres preuves" },
  ]
  const uploaded = new Set(documents.map(d => d.type))
  const completeness = Math.round((sixRequiredDocs.filter(d => uploaded.has(d.type)).length / sixRequiredDocs.length) * 100)
  const kycStatus: "pending" | "reviewing" | "approved" | "rejected" = "pending"

  const missingDocs = sixRequiredDocs.filter(d => !uploaded.has(d.type))

  const handleDocumentAdded = async (_newDoc: any) => {}

  const handlePublishKYC = async () => {}

  const userObj = userRow

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={userObj} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Télécharger vos Documents KYC</h1>
          <p className="text-muted-foreground">Complétez vos 6 documents obligatoires pour activer votre compte</p>
        </div>

        {kycStatus === "approved" && (
          <Alert className="mb-6 border-green-600 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
              Votre KYC a été approuvé ! Vous pouvez maintenant effectuer vos opérations de change.
            </AlertDescription>
          </Alert>
        )}

        {kycStatus === "reviewing" && (
          <Alert className="mb-6 border-amber-600 bg-amber-600/5">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-600">
              Votre demande KYC est en révision. Un administrateur examinera vos documents.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={kycStatus === "approved" ? "completeness" : "upload"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            {kycStatus !== "approved" && (
              <TabsTrigger value="upload">Télécharger</TabsTrigger>
            )}
            <TabsTrigger value="completeness">Complétude</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
          </TabsList>

          {kycStatus !== "approved" && (
            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Télécharger un document</CardTitle>
                  <CardDescription>Formats: PDF/JPG/PNG</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2">
                  <form action={uploadDocAction} className="col-span-3 grid grid-cols-3 gap-2">
                    <Select name="type" defaultValue="rc">
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {sixRequiredDocs.map(d => (<SelectItem key={d.type} value={d.type}>{d.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Input type="file" name="file" className="col-span-2" />
                    <Button type="submit">Uploader</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documents Téléchargés ({documents.length}/6)</CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun document téléchargé</p>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{doc.fileName}</span>
                          <Badge variant="outline">{doc.type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="completeness">
            <KYCCompleteness
              completeness={completeness}
              requiredDocs={sixRequiredDocs}
              uploadedDocs={documents.map(d => d.type)}
              missingDocs={missingDocs}
            />
          </TabsContent>

          <TabsContent value="analysis">
            {agentAnalysis ? (
              <Card>
                <CardHeader>
                  <CardTitle>Analyse KYC par Agent IA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Qualité des documents</p>
                    <Progress value={agentAnalysis.quality} className="mt-2" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Niveau de Risque AML</p>
                    <Badge className={`mt-2 ${
                      agentAnalysis.risk === "Low" ? "bg-green-600" :
                      agentAnalysis.risk === "Medium" ? "bg-amber-600" :
                      "bg-red-600"
                    }`}>
                      {agentAnalysis.risk}
                    </Badge>
                  </div>
                  {typeof agentAnalysis.kycScore === 'number' && (
                    <div>
                      <p className="text-sm font-medium">Score KYC</p>
                      <Badge className="mt-2 bg-primary/20 text-primary">
                        {agentAnalysis.kycScore}/100
                      </Badge>
                    </div>
                  )}
                  {typeof agentAnalysis.kycStatus === 'string' && (
                    <div>
                      <p className="text-sm font-medium">Statut KYC</p>
                      <Badge className={`mt-2 ${agentAnalysis.kycScore >= 80 ? 'bg-green-600' : 'bg-amber-600'}`}>
                        {agentAnalysis.kycStatus}
                      </Badge>
                    </div>
                  )}
                  {agentAnalysis.flags?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Alertes</p>
                      <ul className="mt-2 space-y-1">
                        {agentAnalysis.flags.map((flag: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Publiez votre KYC pour voir l'analyse de l'agent IA</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {kycStatus !== "approved" && (
          <div className="mt-8 flex gap-4">
            <form action={async () => { "use server"; const prisma = getPrisma(); await prisma.kycProfile.upsert({ where: { companyId: userRow.company.id }, update: { complianceStatus: completeness===100 ? 'reviewing' : 'pending' }, create: { companyId: userRow.company.id, complianceStatus: completeness===100 ? 'reviewing' : 'pending' } }); revalidatePath('/pme/kyc-documents') } } className="flex-1">
              <Button type="submit" disabled={completeness < 100} className="w-full">
                {`Publier KYC (${completeness}% complet)`}
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
