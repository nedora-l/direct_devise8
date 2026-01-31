import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { audit } from "@/lib/audit-logger"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !(session as any).user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = getPrisma()
    const userId = (session as any).user.id as string
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { company: { include: { kyc: true } } } 
    })

    if (!user || !user.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const kyc = user.company.kyc
    if (!kyc) {
      return NextResponse.json({ profile: null })
    }

    // Transform Prisma model to KYCProfile interface
    const profileData = (kyc.profileData as any) || {}
    const profile = {
      id: kyc.id,
      companyId: kyc.companyId,
      complianceStatus: kyc.complianceStatus,
      lastReviewDate: kyc.lastReviewDate?.toISOString(),
      expiryDate: kyc.expiryDate?.toISOString(),
      createdAt: kyc.createdAt.toISOString(),
      updatedAt: kyc.updatedAt.toISOString(),
      ...profileData,
    }

    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !(session as any).user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { profileData } = body

    if (!profileData) {
      return NextResponse.json({ error: "Missing profileData" }, { status: 400 })
    }

    const prisma = getPrisma()
    const userId = (session as any).user.id as string
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { company: true } 
    })

    if (!user || !user.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Create or update KYC profile
    const kyc = await prisma.kycProfile.upsert({
      where: { companyId: user.company.id },
      update: {
        profileData: profileData as any,
        updatedAt: new Date(),
      },
      create: {
        companyId: user.company.id,
        complianceStatus: "pending",
        profileData: profileData as any,
      },
    })

    // Update Company with RC and ICE if provided
    if (profileData.registrationNumber || profileData.taxId) {
      await prisma.company.update({
        where: { id: user.company.id },
        data: {
          rc: profileData.registrationNumber || user.company.rc,
          ice: profileData.taxId || user.company.ice,
        },
      })
    }

    audit(userId, "pme", "KYC_SUBMITTED", "kyc_profile", kyc.id, profileData)

    const transformedProfile = {
      id: kyc.id,
      companyId: kyc.companyId,
      complianceStatus: kyc.complianceStatus,
      lastReviewDate: kyc.lastReviewDate?.toISOString(),
      expiryDate: kyc.expiryDate?.toISOString(),
      createdAt: kyc.createdAt.toISOString(),
      updatedAt: kyc.updatedAt.toISOString(),
      ...profileData,
    }

    return NextResponse.json({ profile: transformedProfile }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}
