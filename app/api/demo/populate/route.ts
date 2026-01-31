import { NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"
export const runtime = "nodejs"

export async function POST() {
  const prisma = getPrisma()

  const companyPme =
    (await prisma.company.findFirst({ where: { name: "Demo PME Inc" } })) ||
    (await prisma.company.create({ data: { name: "Demo PME Inc" } }))
  const companyBank =
    (await prisma.company.findFirst({ where: { name: "Demo Bank" } })) ||
    (await prisma.company.create({ data: { name: "Demo Bank" } }))
  const companyAdmin =
    (await prisma.company.findFirst({ where: { name: "Direct Devise" } })) ||
    (await prisma.company.create({ data: { name: "Direct Devise" } }))

  const hash = await bcrypt.hash("Demo12345", 10)

  await prisma.user.upsert({
    where: { email: "pme@demo.com" },
    update: { role: "pme", companyId: companyPme.id, name: "Demo PME", passwordHash: hash },
    create: { email: "pme@demo.com", role: "pme", companyId: companyPme.id, name: "Demo PME", passwordHash: hash },
  })
  await prisma.user.upsert({
    where: { email: "bank@demo.com" },
    update: { role: "bank", companyId: companyBank.id, name: "Demo Bank", passwordHash: hash },
    create: { email: "bank@demo.com", role: "bank", companyId: companyBank.id, name: "Demo Bank", passwordHash: hash },
  })
  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: { role: "admin", companyId: companyAdmin.id, name: "Direct Devise", passwordHash: hash },
    create: { email: "admin@demo.com", role: "admin", companyId: companyAdmin.id, name: "Direct Devise", passwordHash: hash },
  })

  const auctionId = "AUC-001"
  const auction = await prisma.auction.upsert({
    where: { id: auctionId },
    update: {
      companyId: companyPme.id,
      title: "Financement MT103",
      amount: 100000,
      sourceCurrency: "EUR",
      targetCurrency: "MAD",
      description: "Opération d'export",
      duration: 7,
      status: "active",
      createdBy: "pme@demo.com",
      endsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      swiftReference: "REF-2025-001",
    },
    create: {
      id: auctionId,
      companyId: companyPme.id,
      title: "Financement MT103",
      amount: 100000,
      sourceCurrency: "EUR",
      targetCurrency: "MAD",
      description: "Opération d'export",
      duration: 7,
      status: "active",
      createdBy: "pme@demo.com",
      createdAt: new Date(),
      endsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      swiftReference: "REF-2025-001",
    },
  })

  await prisma.bid.upsert({
    where: { id: "BID-001" },
    update: {
      auctionId: auction.id,
      bankId: "BANK-001",
      bankName: "BMCE Bank",
      rate: 10.2,
      charges: 150,
      terms: "Paiement 7j",
      timestamp: new Date(),
    },
    create: {
      id: "BID-001",
      auctionId: auction.id,
      bankId: "BANK-001",
      bankName: "BMCE Bank",
      rate: 10.2,
      charges: 150,
      terms: "Paiement 7j",
      timestamp: new Date(),
    },
  })

  await prisma.swift.upsert({
    where: { reference: "REF-2025-001" },
    update: {
      companyId: companyPme.id,
      amount: 100000,
      currency: "EUR",
      parsedJson: { reference: "REF-2025-001", currency: "EUR", amount: "100000" },
      validated: true,
      validatedAt: new Date(),
    },
    create: {
      companyId: companyPme.id,
      reference: "REF-2025-001",
      amount: 100000,
      currency: "EUR",
      parsedJson: { reference: "REF-2025-001", currency: "EUR", amount: "100000" },
      validated: true,
      validatedAt: new Date(),
    },
  })

  await prisma.document.create({
    data: { companyId: companyPme.id, type: "rc", fileName: "RC_demo.pdf" },
  })
  await prisma.document.create({
    data: { companyId: companyPme.id, type: "ice", fileName: "ICE_demo.pdf" },
  })

  await prisma.kycProfile.upsert({
    where: { companyId: companyPme.id },
    update: { complianceStatus: "approved", lastReviewDate: new Date() },
    create: { companyId: companyPme.id, complianceStatus: "approved", lastReviewDate: new Date() },
  })

  const source = "testing_files"
  const baseDir = path.join(process.cwd(), source)
  try {
    const entries = fs.readdirSync(baseDir)
    const map: Record<string, string> = {
      "RC.txt": "rc",
      "Statuts_societe.txt": "statuts",
      "Facture.txt": "facture",
      "CIN_recto.txt": "identity_recto",
      "CIN_verso.txt": "identity_verso",
      "Liste_UBO.txt": "ubo_list",
      "SWIFT_legit.txt": "swift_text",
    }
    for (const file of entries) {
      const type = map[file]
      if (!type) continue
      const full = path.join(baseDir, file)
      const content = fs.readFileSync(full, "utf8")
            if (type === "swift_text") {
              const ref = "REF-FS-001"
              const amount = 25000
              const currency = "EUR"
              const parsedJson = {
                raw: content,
                igoc: {
                  allowed70: Math.round(amount * 0.7),
                  reserve30: Math.round(amount * 0.3),
                },
              }
              await prisma.swift.upsert({
                where: { reference: ref },
                update: {
                  companyId: companyPme.id,
                  parsedJson,
                  amount,
                  currency,
                  validated: true,
                  validatedAt: new Date(),
                },
                create: {
                  reference: ref,
                  companyId: companyPme.id,
                  parsedJson,
                  amount,
                  currency,
                  validated: true,
                  validatedAt: new Date(),
                },
              })
            } else {
              // Convert file content to base64
              const fileBuffer = fs.readFileSync(full)
              const base64Content = fileBuffer.toString('base64')
              const mimeType = file.endsWith('.txt') ? 'text/plain' : file.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
              
              await prisma.document.create({ 
                data: { 
                  companyId: companyPme.id, 
                  type, 
                  fileName: file,
                  mimeType,
                  contentBase64: base64Content,
                } 
              })
            }
    }
  } catch {}

  return NextResponse.json({ ok: true })
}