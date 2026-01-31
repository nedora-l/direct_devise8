import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const body = await req.json()
    const swifts: any[] = body.swifts || []

  for (const s of swifts) {
      let company = await prisma.company.findFirst({ where: { name: s.company } })
      if (!company) {
        company = await prisma.company.create({ data: { name: s.company } })
      }

      const ref = s.parsedData?.reference || s.id
      if (!ref) continue

    const amt = Number(s.parsedData?.amount) || 0
    const cur = s.parsedData?.currency || "MAD"
    const baseJson = s.parsedData || {}
    const parsedWithLimits = {
      ...baseJson,
      igoc: {
        allowed70: Math.round(amt * 0.7),
        reserve30: Math.round(amt * 0.3),
      },
    }

    await prisma.swift.upsert({
      where: { reference: ref },
      update: {
        companyId: company.id,
        amount: amt,
        currency: cur,
        parsedJson: parsedWithLimits,
        validated: !!s.validated,
        validatedAt: s.validatedAt ? new Date(s.validatedAt) : null,
      },
      create: {
        companyId: company.id,
        reference: ref,
        amount: amt,
        currency: cur,
        parsedJson: parsedWithLimits,
        validated: !!s.validated,
        validatedAt: s.validatedAt ? new Date(s.validatedAt) : null,
      },
    })
  }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}