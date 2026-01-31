import { NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import bcrypt from "bcryptjs"
export const runtime = "nodejs"

export async function POST() {
  const prisma = getPrisma()
  const users = [
    { email: "pme@demo.com", name: "Demo PME", role: "pme", password: "Demo12345" },
    { email: "bank@demo.com", name: "Demo Bank", role: "bank", password: "Demo12345" },
    { email: "admin@demo.com", name: "Direct Devise", role: "admin", password: "Demo12345" },
  ]
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash: hash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash: hash },
    })
  }
  return NextResponse.json({ ok: true })
}