import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

/**
 * Get the last unverified code for a company (dev mode only)
 * GET /api/register/pme/verification/get-last-code?companyId=xxx
 */
export async function GET(req: NextRequest) {
  // Only allow in development
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV
  if (!isDev) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    const companyId = req.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId requis" }, { status: 400 })
    }

    const prisma = getPrisma()

    // Get the most recent unverified code for this company
    const lastCode = await prisma.verificationCode.findFirst({
      where: {
        companyId,
        status: "pending",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!lastCode) {
      return NextResponse.json({ 
        error: "Aucun code en attente trouvé",
        hint: "Demandez un nouveau code de vérification"
      }, { status: 404 })
    }

    // Check if expired
    const isExpired = new Date() > lastCode.expiresAt
    if (isExpired) {
      return NextResponse.json({ 
        error: "Le code a expiré",
        hint: "Demandez un nouveau code de vérification",
        expiredAt: lastCode.expiresAt.toISOString()
      }, { status: 410 })
    }

    return NextResponse.json({
      code: lastCode.code,
      channel: lastCode.channel,
      expiresAt: lastCode.expiresAt.toISOString(),
      createdAt: lastCode.createdAt.toISOString(),
      note: "Mode développement uniquement"
    })
  } catch (error) {
    console.error("[verification/get-last-code] Error:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la récupération du code",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}






