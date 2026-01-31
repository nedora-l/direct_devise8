import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { audit } from "@/lib/audit-logger"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { companyId, documentType, fileName, mimeType, contentBase64 } = body

    if (!companyId || !documentType || !fileName || !contentBase64) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    const prisma = getPrisma()

    // Verify company exists and get user
    const company = await prisma.company.findUnique({ 
      where: { id: companyId },
      include: { users: { take: 1 } }
    })
    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    const userId = company.users[0]?.id || companyId // Fallback to companyId if no user

    // Create document
    const document = await prisma.document.create({
      data: {
        companyId,
        type: documentType,
        fileName,
        mimeType: mimeType || "application/pdf",
        contentBase64,
      },
    })

    try {
      audit.log(userId, "pme", "DOCUMENT_UPLOADED", "document", document.id, {
        documentType,
        fileName,
      })
    } catch (auditError) {
      // Silently continue if audit fails
      console.error("[audit] Failed to log document upload:", auditError)
    }

    return NextResponse.json({ success: true, documentId: document.id }, { status: 201 })
  } catch (error) {
    console.error("[register/pme/documents] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'upload du document"
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId requis" }, { status: 400 })
    }

    const prisma = getPrisma()
    const documents = await prisma.document.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération des documents" }, { status: 500 })
  }
}

