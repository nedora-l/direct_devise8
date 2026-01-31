import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { parseSWIFT } from "@/lib/swift-parser"

export const runtime = "nodejs"

/**
 * Create a demo SWIFT in DB for testing parsing + flows.
 * Usage: GET /api/demo/create-swift?company=Demo%20PME%20Inc
 */
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const companyName = req.nextUrl.searchParams.get("company") || "Demo PME Inc"

    const company =
      (await prisma.company.findFirst({ where: { name: companyName } })) ||
      (await prisma.company.create({ data: { name: companyName } }))

    // Minimal, realistic MT103 content
    const ref = `SWIFT-DEMO-${Date.now()}`
    const swiftText = `:{1:F01AAAABBBBCCCCD}{2:O1031200AAAABBBBCCCCD}{4:
:20:${ref}
:32A:241125EUR25000,00
:50A:AAAABBBB
:59:/FR7630006000011234567890189
Beneficiary Name
:71A:OUR
}`

    const parsed = parseSWIFT(swiftText)
    if (!parsed.valid || !parsed.data) {
      return NextResponse.json({ ok: false, error: "Demo SWIFT invalid" }, { status: 400 })
    }

    const amount = Number(parsed.data.amount) || 0
    const currency = parsed.data.currency || "EUR"
    const parsedJson: any = {
      ...parsed.data,
      raw: swiftText,
      igoc: {
        allowed30: Math.round(amount * 0.3),
        reserve70: Math.round(amount * 0.7),
      },
    }

    const swift = await prisma.swift.upsert({
      where: { reference: ref },
      update: {
        companyId: company.id,
        amount,
        currency,
        parsedJson,
        validated: false,
        validatedAt: null,
      },
      create: {
        reference: ref,
        companyId: company.id,
        amount,
        currency,
        parsedJson,
        validated: false,
        validatedAt: null,
      },
    })

    return NextResponse.json({ ok: true, swift })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
