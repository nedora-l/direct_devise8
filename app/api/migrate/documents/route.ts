import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const body = await req.json()
    const companyName: string = body.company
    const documents: Array<{ type: string; fileName: string; createdAt?: string }> = body.documents || []

    const company =
      (await prisma.company.findFirst({ where: { name: companyName } })) ||
      (await prisma.company.create({ data: { name: companyName } }))

    for (const d of documents) {
      await prisma.document.create({
        data: {
          companyId: company.id,
          type: d.type,
          fileName: d.fileName,
          createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}