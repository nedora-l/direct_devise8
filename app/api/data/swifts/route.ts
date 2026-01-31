import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !(session as any).user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = getPrisma()
    const userId = (session as any).user.id as string
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
    
    if (!user || !user.company) {
      return NextResponse.json({ swifts: [] })
    }

    // Support single SWIFT fetch by id
    const { searchParams } = new URL(req.url)
    const swiftId = searchParams.get("id")
    
    if (swiftId) {
      const swift = await prisma.swift.findUnique({
        where: { id: swiftId },
        include: { company: true },
      })
      if (!swift || swift.companyId !== user.company.id) {
        return NextResponse.json({ error: "SWIFT not found" }, { status: 404 })
      }
      return NextResponse.json({ swift })
    }

    const swifts = await prisma.swift.findMany({ 
      where: { companyId: user.company.id }, 
      include: { company: true },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json({ swifts })
  } catch {
    return NextResponse.json({ swifts: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !(session as any).user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = getPrisma()
    const userId = (session as any).user.id as string
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
    
    if (!user || !user.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Vérification KYC stricte pour upload SWIFT (tous les SWIFT doivent passer par validation admin)
    const kyc = await prisma.kycProfile.findUnique({ where: { companyId: user.company.id } })
    if (!kyc || kyc.complianceStatus !== "approved") {
      return NextResponse.json({ 
        error: "KYC non approuvé. Veuillez compléter votre vérification KYC avant d'uploader un SWIFT." 
      }, { status: 403 })
    }

    const body = await req.json()

    if (body.action === "validate") {
      const { reference, validated } = body
      if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 })
      const swift = await prisma.swift.findFirst({ where: { reference, companyId: user.company.id } })
      if (!swift) return NextResponse.json({ error: "swift not found" }, { status: 404 })
      const updated = await prisma.swift.update({
        where: { id: swift.id },
        data: { validated: !!validated, validatedAt: !!validated ? new Date() : null, adminStatus: !!validated ? "approved" : "pending", rejectionReason: null },
      })
      return NextResponse.json({ swift: updated })
    }

    if (body.action === "reject") {
      const { reference, reason } = body
      if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 })
      const swift = await prisma.swift.findFirst({ where: { reference, companyId: user.company.id } })
      if (!swift) return NextResponse.json({ error: "swift not found" }, { status: 404 })
      const parsed = { ...(swift.parsedJson || {}), rejected: true, rejectionReason: String(reason || "") }
      const updated = await prisma.swift.update({
        where: { id: swift.id },
        data: { validated: false, validatedAt: null, parsedJson: parsed, adminStatus: "rejected", rejectionReason: String(reason || "") },
      })
      return NextResponse.json({ swift: updated })
    }

    // Upsert SWIFT - TOUS les SWIFT uploadés par PME doivent passer par validation admin
    const { reference, amount, currency, parsedJson } = body
    if (!reference || !amount || !currency || !parsedJson) {
      return NextResponse.json({ error: "Missing fields: reference, amount, currency, parsedJson required" }, { status: 400 })
    }

    const amt = Number(amount) || 0
    const used = await prisma.auction.findFirst({ where: { swiftReference: reference } })
    if (used) {
      return NextResponse.json({ error: "SWIFT déjà utilisé pour une enchère" }, { status: 400 })
    }

    // Force validation admin pour tous les SWIFT uploadés par PME
    const validated = false // Toujours false pour les uploads PME
    const adminStatus = "pending" // Toujours pending pour validation admin
    
    // Expiration par défaut : 30 jours selon réglementation IGOC Maroc
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const parsedWithLimits = {
      ...parsedJson,
      igoc: {
        allowed30: Math.round(amt * 0.3),
        reserve70: Math.round(amt * 0.7),
      },
    }

    // Check if SWIFT with same reference exists for this company
    const existingSwift = await prisma.swift.findFirst({
      where: { 
        reference,
        companyId: user.company.id 
      },
    })

    let swift
    if (existingSwift) {
      // Update existing SWIFT for this company
      swift = await prisma.swift.update({
        where: { id: existingSwift.id },
        data: {
          amount: amt,
          currency,
          parsedJson: parsedWithLimits,
          validated: false, // Force validation admin
          validatedAt: null,
          adminStatus: "pending", // Force pending pour validation admin
          expiresAt, // 30 jours selon IGOC Maroc
          rateStrategy: "auction", // Par défaut : enchère directe
        },
      })
    } else {
      // Check if reference exists for another company (unique constraint)
      const referenceExists = await prisma.swift.findUnique({
        where: { reference },
      })
      
      if (referenceExists) {
        // Reference already used by another company - create with modified reference
        const uniqueReference = `${reference}-${user.company.id.slice(0, 8)}`
        swift = await prisma.swift.create({
          data: {
            companyId: user.company.id,
            reference: uniqueReference,
            amount: amt,
            currency,
            parsedJson: {
              ...parsedWithLimits,
              originalReference: reference, // Keep original for reference
            },
            validated: !!validated,
            validatedAt: validated ? new Date() : null,
            adminStatus: validated ? "approved" : "pending",
          },
        })
      } else {
        // Create new SWIFT
        swift = await prisma.swift.create({
          data: {
            companyId: user.company.id,
            reference,
            amount: amt,
            currency,
            parsedJson: parsedWithLimits,
            validated: !!validated,
            validatedAt: validated ? new Date() : null,
            adminStatus: validated ? "approved" : "pending",
          },
        })
      }
    }

    return NextResponse.json({ swift })
  } catch (e) {
    console.error("[api/data/swifts] Error:", e)
    const errorMessage = e instanceof Error ? e.message : "Failed to save SWIFT"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
