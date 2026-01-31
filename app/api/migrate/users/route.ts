import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const body = await req.json()
    const snapshots: Array<{ email: string; role: string; company?: string; name?: string }> = body.snapshots || []

    for (const s of snapshots) {
      const companyName = s.company || "Demo Company"
      const company =
        (await prisma.company.findFirst({ where: { name: companyName } })) ||
        (await prisma.company.create({ data: { name: companyName } }))

      await prisma.user.upsert({
        where: { email: s.email },
        update: { role: s.role, companyId: company.id, name: s.name || s.email.split("@")[0] },
        create: { email: s.email, role: s.role, companyId: company.id, name: s.name || s.email.split("@")[0] },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}