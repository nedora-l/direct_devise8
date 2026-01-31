import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session as any).user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = getPrisma()
    const status = req.nextUrl.searchParams.get("status") || "pending"

    const profiles = await prisma.kycProfile.findMany({
      where: { complianceStatus: status },
      include: {
        company: {
          include: {
            users: { take: 1 },
            documents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const submissions = profiles.map(p => {
      const user = p.company.users[0]
      const profileData = (p.profileData as any) || {}
      
      return {
        company: p.company.name,
        companyId: p.company.id,
        companyInfo: {
          name: p.company.name,
          email: user?.email || "",
          phone: profileData.phone || "",
          sector: profileData.sector || "",
          siret: profileData.siret || p.company.rc || "",
        },
        documents: p.company.documents.map(d => ({
          type: d.type,
          fileName: d.fileName,
          id: d.id,
        })),
        completeness: Math.round((p.company.documents.length / 6) * 100),
        status: p.complianceStatus as "pending" | "reviewing" | "approved" | "rejected",
        publishedAt: p.createdAt.toISOString(),
        analysis: profileData.analysis || null,
      }
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error("[kyc/profile/all] Error:", error)
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session as any).user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { companyId, status, notes } = body

    if (!companyId || !status) {
      return NextResponse.json({ error: "companyId and status required" }, { status: 400 })
    }

    const prisma = getPrisma()
    const adminEmail = (session as any).user.email || "admin@direct-devise.com"

    const kyc = await prisma.kycProfile.update({
      where: { companyId },
      data: {
        complianceStatus: status,
        lastReviewDate: new Date(),
        ...(status === "approved" && {
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }),
      },
    })

    // Log audit
    try {
      const audit = (await import("@/lib/audit-logger")).audit
      audit.log((session as any).user.id, "admin", "KYC_STATUS_UPDATED", "kyc_profile", kyc.id, {
        status,
        notes,
        adminEmail,
      })
    } catch (auditError) {
      console.error("[audit] Failed to log:", auditError)
    }

    return NextResponse.json({ success: true, kyc })
  } catch (error) {
    console.error("[kyc/profile/all] Error:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}






