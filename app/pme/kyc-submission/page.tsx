import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const REQUIRED = ["rc","ice","patente","identity","ubo","activity"]

export default async function KYCSubmissionPage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).user || (session as any).user.role !== "pme") {
    redirect("/pme/login")
  }
  const prisma = getPrisma()
  const userId = (session as any).user.id as string
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
  if (!user || !user.company) redirect("/pme/login")

  const companyId = user.company.id
  const docs = await prisma.document.findMany({ where: { companyId } })
  const uploadedTypes = new Set(docs.map(d => d.type))
  const completeness = Math.round((REQUIRED.filter(t => uploadedTypes.has(t)).length / REQUIRED.length) * 100)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Soumission KYC</h1>
          <p className="text-muted-foreground">Téléchargez vos 6 documents obligatoires • Entreprise: {user.company.name}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Documents Téléchargés ({docs.length}/{REQUIRED.length})</CardTitle>
            <CardDescription>Complétude: {completeness}%</CardDescription>
          </CardHeader>
          <CardContent>
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun document uploadé</p>
            ) : (
              <div className="space-y-2">
                {docs.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{d.fileName}</p>
                      <p className="text-xs text-muted-foreground">{d.type.toUpperCase()}</p>
                    </div>
                    <Badge variant="outline">{d.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents Manquants</CardTitle>
            <CardDescription>Déposez via la page Documents</CardDescription>
          </CardHeader>
          <CardContent>
            {REQUIRED.filter(t => !uploadedTypes.has(t)).length === 0 ? (
              <p className="text-sm text-muted-foreground">Tous les documents requis sont présents</p>
            ) : (
              <ul className="list-disc ml-6 text-sm">
                {REQUIRED.filter(t => !uploadedTypes.has(t)).map(t => (
                  <li key={t}>{t.toUpperCase()}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
