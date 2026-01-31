import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const body = await req.json()
    const submissions: any[] = body.submissions || []

    for (const sub of submissions) {
      let company = await prisma.company.findFirst({ where: { name: sub.company } })
      if (!company) {
        company = await prisma.company.create({ data: { name: sub.company } })
      }

      await prisma.kycProfile.upsert({
        where: { companyId: company.id },
        update: {
          complianceStatus: sub.status || "pending",
          lastReviewDate: sub.reviewedAt ? new Date(sub.reviewedAt) : null,
          expiryDate: null,
        },
        create: {
          companyId: company.id,
          complianceStatus: sub.status || "pending",
          lastReviewDate: sub.reviewedAt ? new Date(sub.reviewedAt) : null,
          expiryDate: null,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}