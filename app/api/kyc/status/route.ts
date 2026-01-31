import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId")
    const email = req.nextUrl.searchParams.get("email")
    const userId = req.nextUrl.searchParams.get("userId")

    if (!companyId && !email && !userId) {
      return NextResponse.json({ error: "companyId, email ou userId requis" }, { status: 400 })
    }

    const prisma = getPrisma()

    let company
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { kyc: true, users: { take: 1 } },
      })
    } else if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { company: { include: { kyc: true } } },
      })
      company = user?.company
    } else if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: { include: { kyc: true } } },
      })
      company = user?.company
    }

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    const kycStatus = company.kyc?.complianceStatus || "pending"

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      kycStatus,
      kycProfile: company.kyc,
    })
  } catch (error) {
    console.error("[kyc/status] Error:", error)
    return NextResponse.json({ error: "Erreur lors de la vérification" }, { status: 500 })
  }
}

