import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
export const runtime = "nodejs"

/**
 * Diagnostic endpoint for admin to check account status
 * GET /api/admin/diagnose?companyId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session as any).user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const companyId = req.nextUrl.searchParams.get("companyId")
    const email = req.nextUrl.searchParams.get("email")
    const companyName = req.nextUrl.searchParams.get("companyName")

    if (!companyId && !email && !companyName) {
      return NextResponse.json({ error: "companyId, email ou companyName requis" }, { status: 400 })
    }

    const prisma = getPrisma()

    let company
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          users: true,
          documents: true,
          swifts: true,
          kyc: true,
        },
      })
    } else if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          company: {
            include: {
              users: true,
              documents: true,
              swifts: true,
              kyc: true,
            },
          },
        },
      })
      company = user?.company
    } else if (companyName) {
      company = await prisma.company.findFirst({
        where: { name: companyName },
        include: {
          users: true,
          documents: true,
          swifts: true,
          kyc: true,
        },
      })
    }

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    // Analyze documents
    const documentsWithContent = company.documents.filter(d => !!d.contentBase64)
    const documentsWithoutContent = company.documents.filter(d => !d.contentBase64)
    const kycRelevantDocs = company.documents.filter(d => 
      ["rc", "statuts", "ice", "patente"].includes(d.type)
    )

    // Analyze SWIFT
    const validatedSwifts = company.swifts.filter(s => s.validated)
    const pendingSwifts = company.swifts.filter(s => s.adminStatus === "pending")

    // Recommendations
    const recommendations: string[] = []
    if (documentsWithoutContent.length > 0) {
      recommendations.push(`${documentsWithoutContent.length} document(s) sans contenu (contentBase64 manquant)`)
    }
    if (kycRelevantDocs.length === 0) {
      recommendations.push("Aucun document KYC pertinent (rc, statuts, ice, patente)")
    }
    if (company.kyc?.complianceStatus === "pending") {
      recommendations.push("KYC en attente d'approbation")
    }
    if (pendingSwifts.length > 0) {
      recommendations.push(`${pendingSwifts.length} SWIFT(s) en attente de validation admin`)
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        rc: company.rc,
        ice: company.ice,
        country: company.country,
      },
      users: company.users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
      })),
      kyc: {
        status: company.kyc?.complianceStatus || "pending",
        lastReviewDate: company.kyc?.lastReviewDate?.toISOString(),
        expiryDate: company.kyc?.expiryDate?.toISOString(),
      },
      documents: {
        total: company.documents.length,
        withContent: documentsWithContent.length,
        withoutContent: documentsWithoutContent.length,
        kycRelevant: kycRelevantDocs.length,
        byType: company.documents.reduce((acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        missingContent: documentsWithoutContent.map(d => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName,
        })),
      },
      swifts: {
        total: company.swifts.length,
        validated: validatedSwifts.length,
        pending: pendingSwifts.length,
        byStatus: company.swifts.reduce((acc, s) => {
          acc[s.adminStatus] = (acc[s.adminStatus] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
      recommendations,
      health: {
        score: Math.round(
          (documentsWithContent.length / Math.max(company.documents.length, 1)) * 40 +
          (company.kyc?.complianceStatus === "approved" ? 30 : 0) +
          (validatedSwifts.length > 0 ? 30 : 0)
        ),
        status: documentsWithContent.length === company.documents.length && 
                company.kyc?.complianceStatus === "approved" ? "healthy" : "needs_attention",
      },
    })
  } catch (error) {
    console.error("[admin/diagnose] Error:", error)
    return NextResponse.json({ 
      error: "Erreur lors du diagnostic",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}






