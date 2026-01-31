import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId requis" }, { status: 400 })
    }

    const prisma = getPrisma()

    // Check if there's a verified verification code
    const verifiedCode = await prisma.verificationCode.findFirst({
      where: {
        companyId,
        status: "verified",
      },
      orderBy: { verifiedAt: "desc" },
    })

    // Check KYC status
    const kyc = await prisma.kycProfile.findUnique({
      where: { companyId },
    })

    const verified = verifiedCode !== null || kyc?.complianceStatus === "approved"

    return NextResponse.json({ 
      verified,
      verifiedAt: verifiedCode?.verifiedAt?.toISOString(),
      kycStatus: kyc?.complianceStatus,
    })
  } catch (error) {
    console.error("[verification/check] Error:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la vérification",
      verified: false
    }, { status: 500 })
  }
}






