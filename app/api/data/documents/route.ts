import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const companyName = req.nextUrl.searchParams.get("company") || ""
    const id = req.nextUrl.searchParams.get("id") || ""
    const prisma = getPrisma()
    if (id) {
      const doc = await prisma.document.findFirst({ where: { id } })
      if (!doc || !doc.contentBase64) return NextResponse.json({ error: "not_found" }, { status: 404 })
      const bytes = Buffer.from(doc.contentBase64, 'base64')
      return new NextResponse(bytes, { headers: { 'Content-Type': doc.mimeType || 'application/octet-stream' } })
    }
    const company = await prisma.company.findFirst({ where: { name: companyName } })
    if (!company) return NextResponse.json({ documents: [] })
    const documents = await prisma.document.findMany({ where: { companyId: company.id } })
    return NextResponse.json({ documents })
  } catch {
    return NextResponse.json({ documents: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const body = await req.json()
    const { company, companyId, type, fileName, mimeType, base64, contentBase64 } = body
    
    // Support both old format (company name) and new format (companyId from session)
    let finalCompanyId: string | null = null
    
    if (companyId) {
      finalCompanyId = companyId
    } else if (company) {
      const companyRow = await prisma.company.findFirst({ where: { name: company } })
      if (!companyRow) return NextResponse.json({ error: "company not found" }, { status: 404 })
      finalCompanyId = companyRow.id
    } else {
      // Try to get from session
      const { getServerSession } = await import("next-auth")
      const { authOptions } = await import("@/lib/auth")
      const session = await getServerSession(authOptions)
      if (session && (session as any).user) {
        const user = await prisma.user.findUnique({ 
          where: { id: (session as any).user.id },
          include: { company: true }
        })
        if (user?.company) {
          finalCompanyId = user.company.id
        }
      }
    }
    
    if (!finalCompanyId || !type || !fileName || (!base64 && !contentBase64)) {
      return NextResponse.json({ error: "Missing fields: companyId/company, type, fileName, base64/contentBase64 required" }, { status: 400 })
    }
    
    const created = await prisma.document.create({
      data: {
        companyId: finalCompanyId,
        type,
        fileName,
        mimeType,
        contentBase64: contentBase64 || base64,
      }
    })
    return NextResponse.json({ document: created })
  } catch (error) {
    console.error("[api/data/documents] Error:", error)
    return NextResponse.json({ error: "Failed", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
