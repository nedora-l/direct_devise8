import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { documentTemplates, DocumentType, CompanyData, documentTitles } from '@/lib/document-templates'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const doc = (req.nextUrl.searchParams.get('doc') || '') as DocumentType
  const companyData: CompanyData = {
    company: userRow.company.name,
    registrationNumber: userRow.company.registrationNumber || '—',
    address: userRow.company.address || '—',
    representative: userRow.company.legalRepresentative || '—',
    representativeTitle: userRow.company.representativeTitle || 'Directeur Général',
    city: userRow.company.city || 'Casablanca'
  }
  const content = doc ? documentTemplates[doc](companyData) : 'Document introuvable'
  const fileName = `${doc || 'document'}-${userRow.company.name}-${new Date().toISOString().slice(0,10)}.txt`
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  })
}
