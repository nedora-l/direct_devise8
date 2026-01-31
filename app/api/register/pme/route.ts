import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { audit } from "@/lib/audit-logger"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, companyName, name, sector } = body

    if (!email || !password || !companyName || !sector) {
      return NextResponse.json({ error: "Email, password, nom d'entreprise et secteur d'activité requis" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 })
    }

    const prisma = getPrisma()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create company
    const company = await prisma.company.create({
      data: {
        name: companyName,
        country: "MA",
      },
    })

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split("@")[0],
        role: "pme",
        companyId: company.id,
      },
    })

    // Create KYC profile with pending status and initial data
    const kycProfile = await prisma.kycProfile.create({
      data: {
        companyId: company.id,
        complianceStatus: "pending",
        profileData: {
          sector: sector,
          legalName: companyName,
        },
      },
    })

    try {
      audit(user.id, "pme", "ACCOUNT_CREATED", "user", user.id, {
        email,
        companyName,
      })
    } catch (auditError) {
      // Silently continue if audit fails
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      companyId: company.id,
      kycProfileId: kycProfile.id,
    }, { status: 201 })
  } catch (error) {
    console.error("[register/pme] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de la création du compte"
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

