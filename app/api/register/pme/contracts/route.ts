import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { audit } from "@/lib/audit-logger"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { companyId, contractType, signatureBase64, signedAt } = body

    if (!companyId || !contractType || !signatureBase64) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    const prisma = getPrisma()

    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    // Store signature as a document
    const document = await prisma.document.create({
      data: {
        companyId,
        type: `contract_${contractType}`,
        fileName: `signature_${contractType}_${new Date().toISOString().split("T")[0]}.png`,
        mimeType: "image/png",
        contentBase64: signatureBase64,
      },
    })

    // Get user for audit
    const companyWithUser = await prisma.company.findUnique({
      where: { id: companyId },
      include: { users: { take: 1 } },
    })
    const userId = companyWithUser?.users[0]?.id || companyId

    try {
      audit.log(userId, "pme", "CONTRACT_SIGNED", "document", document.id, {
        contractType,
        signedAt: signedAt || new Date().toISOString(),
      })
    } catch (auditError) {
      console.error("[audit] Failed to log contract signature:", auditError)
    }

    return NextResponse.json({ success: true, documentId: document.id }, { status: 201 })
  } catch (error) {
    console.error("[contracts] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement de la signature"
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
    const contracts = await prisma.document.findMany({
      where: {
        companyId,
        type: { startsWith: "contract_" },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ contracts })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération des contrats" }, { status: 500 })
  }
}

