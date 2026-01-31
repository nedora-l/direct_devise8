import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PMENav from "@/components/pme/pme-nav";
import {
  documentTemplates,
  documentTitles,
  DocumentType,
  CompanyData,
} from "@/lib/document-templates";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: { doc?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session as any).user?.role !== "pme") return null;
  const prisma = getPrisma();
  const user = (session as any).user;
  const userRow = await prisma.user.findUnique({
    where: { id: user.id },
    include: { company: true },
  });
  if (!userRow || !userRow.company) return null;
  const docType = (searchParams?.doc || "") as DocumentType;
  const companyData: CompanyData = {
    company: userRow.company.name,
    registrationNumber: userRow.company.registrationNumber || "—",
    address: userRow.company.address || "—",
    representative: userRow.company.legalRepresentative || "—",
    representativeTitle:
      userRow.company.representativeTitle || "Directeur Général",
    city: userRow.company.city || "Casablanca",
  };
  const content = docType
    ? documentTemplates[docType](companyData)
    : "Document introuvable";
  return (
    <div className="min-h-screen bg-background">
      <PMENav
        user={{
          name: userRow.name,
          email: userRow.email,
          companyName: userRow.company.name,
          role: "pme",
        }}
      />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{documentTitles[docType] || "Aperçu"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-6 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {content}
              </pre>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
