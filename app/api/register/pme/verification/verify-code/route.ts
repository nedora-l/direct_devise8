import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { audit } from "@/lib/audit-logger"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { companyId, code } = body

    console.log("[verify-code] Received request:", { 
      companyId, 
      code, 
      codeType: typeof code,
      codeLength: code?.length 
    })

    if (!companyId || !code) {
      console.error("[verify-code] Missing required fields:", { companyId: !!companyId, code: !!code })
      return NextResponse.json({ 
        error: "companyId et code requis",
        received: { companyId: !!companyId, code: !!code }
      }, { status: 400 })
    }

    // Validate code format - accept both string and number, normalize to string
    const codeStr = String(code).trim().replace(/\s/g, "")
    if (codeStr.length !== 6 || !/^\d{6}$/.test(codeStr)) {
      console.error("[verify-code] Invalid code format:", { 
        original: code, 
        type: typeof code,
        formatted: codeStr, 
        length: codeStr.length,
        isNumeric: /^\d+$/.test(codeStr)
      })
      return NextResponse.json({ 
        error: "Le code doit être composé de 6 chiffres",
        received: code,
        formatted: codeStr
      }, { status: 400 })
    }

    const prisma = getPrisma()

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })
    if (!company) {
      return NextResponse.json({ 
        error: "Entreprise non trouvée",
        companyId
      }, { status: 404 })
    }

    // Find verification code (check both pending and recent verified codes for testing)
    const now = new Date()
    const codeToSearch = codeStr // Use the validated string code
    
    console.log(`[verify-code] Searching for code: "${codeToSearch}" for company: ${companyId} at ${now.toISOString()}`)
    
    // First, get ALL codes for this company to debug
    const allCompanyCodes = await prisma.verificationCode.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    console.log(`[verify-code] All codes for company ${companyId} (${allCompanyCodes.length} total):`, 
      allCompanyCodes.map(c => ({
        id: c.id,
        code: c.code,
        codeType: typeof c.code,
        status: c.status,
        expiresAt: c.expiresAt?.toISOString(),
        verifiedAt: c.verifiedAt?.toISOString(),
        createdAt: c.createdAt.toISOString(),
        isExpired: c.expiresAt ? c.expiresAt < now : true,
        isValid: c.status === "pending" && c.expiresAt && c.expiresAt > now,
        matches: String(c.code).trim() === codeToSearch
      }))
    )
    
    // Try to find matching code (exact match)
    let verificationCode = await prisma.verificationCode.findFirst({
      where: {
        companyId,
        code: codeToSearch,
        status: "pending",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    })
    
    // If not found, try with trimmed comparison (in case of whitespace issues)
    if (!verificationCode) {
      const allPendingCodes = allCompanyCodes.filter(c => c.status === "pending" && c.expiresAt && c.expiresAt > now)
      verificationCode = allPendingCodes.find(c => String(c.code).trim() === codeToSearch) || null
      
      if (verificationCode) {
        console.log(`[verify-code] Found code using trimmed comparison`)
      }
    }

    // Debug log in development
    if (!verificationCode) {
      const allCodes = await prisma.verificationCode.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      console.log(`[verify-code] No pending code found. Recent codes for company ${companyId}:`, 
        allCodes.map(c => ({ 
          code: c.code, 
          status: c.status, 
          expiresAt: c.expiresAt?.toISOString(), 
          createdAt: c.createdAt.toISOString(),
          isExpired: c.expiresAt ? c.expiresAt < now : true,
          matches: c.code === codeToSearch
        }))
      )
      
      // Check if there's a code that matches but is expired
      const expiredMatch = allCodes.find(c => c.code === codeToSearch && c.status === "pending")
      if (expiredMatch) {
        console.log(`[verify-code] Found matching code but expired:`, {
          code: expiredMatch.code,
          expiresAt: expiredMatch.expiresAt?.toISOString(),
          now: now.toISOString(),
          expired: expiredMatch.expiresAt ? expiredMatch.expiresAt < now : true
        })
      }
    } else {
      console.log(`[verify-code] Found valid code:`, {
        code: verificationCode.code,
        expiresAt: verificationCode.expiresAt.toISOString(),
        createdAt: verificationCode.createdAt.toISOString()
      })
    }

    // If not found, check if code was recently verified (within last 5 minutes) for dev/testing
    if (!verificationCode && process.env.NODE_ENV === "development") {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      verificationCode = await prisma.verificationCode.findFirst({
        where: {
          companyId,
          code,
          status: "verified",
          verifiedAt: { gte: fiveMinutesAgo },
        },
        orderBy: { createdAt: "desc" },
      })
      if (verificationCode) {
        // Code already verified, return success
        return NextResponse.json({ 
          success: true,
          verified: true,
          message: "Code déjà vérifié (mode développement)",
          alreadyVerified: true
        }, { status: 200 })
      }
    }

    if (!verificationCode) {
      // Check if code exists but expired
      const expiredCode = await prisma.verificationCode.findFirst({
        where: {
          companyId,
          code: codeToSearch,
        },
        orderBy: { createdAt: "desc" },
      })

      if (expiredCode) {
        console.log(`[verify-code] Code found but expired:`, {
          code: expiredCode.code,
          status: expiredCode.status,
          expiresAt: expiredCode.expiresAt?.toISOString(),
          now: now.toISOString(),
          isExpired: expiredCode.expiresAt ? expiredCode.expiresAt < now : true
        })
        return NextResponse.json({ 
          error: "Code expiré. Veuillez demander un nouveau code.",
          verified: false,
          expired: true,
          expiresAt: expiredCode.expiresAt?.toISOString()
        }, { status: 400 })
      }

      // Check all codes for this company to help debug
      const allCompanyCodes = await prisma.verificationCode.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      
      console.error(`[verify-code] Code not found. Company has ${allCompanyCodes.length} recent codes:`, 
        allCompanyCodes.map(c => ({
          code: c.code,
          status: c.status,
          expiresAt: c.expiresAt?.toISOString(),
          createdAt: c.createdAt.toISOString(),
          matches: c.code === codeToSearch
        }))
      )

      return NextResponse.json({ 
        error: "Code invalide. Vérifiez que vous avez entré le bon code.",
        verified: false,
        companyId,
        searchedCode: codeToSearch,
        codeLength: codeToSearch.length,
        recentCodesCount: allCompanyCodes.length,
        // In dev mode, show recent codes for debugging
        ...(process.env.NODE_ENV === "development" && {
          recentCodes: allCompanyCodes.map(c => ({
            code: c.code,
            status: c.status,
            createdAt: c.createdAt.toISOString()
          }))
        })
      }, { status: 400 })
    }

    // Mark code as verified
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: {
        status: "verified",
        verifiedAt: new Date(),
      },
    })

    // IMPORTANT: Ne PAS approuver automatiquement le KYC !
    // Le KYC doit rester "pending" jusqu'à validation manuelle par un admin
    // La vérification du code email ne fait que confirmer l'email, pas approuver le compte
    // Le KYC reste en "pending" et sera approuvé uniquement par un admin via /admin/account-approval
    // 
    // Le compte sera visible dans /admin/account-approval avec status "pending"
    // et l'admin devra valider manuellement après vérification des documents KYC

    // Get user for audit (company already fetched above)
    const companyWithUser = await prisma.company.findUnique({
      where: { id: companyId },
      include: { users: { take: 1 } },
    })
    const userId = companyWithUser?.users[0]?.id || companyId

    try {
      audit.log(userId, "pme", "KYC_VERIFIED", "kyc_profile", companyId, {
        method: "verification_code",
        channel: verificationCode.channel,
      })
    } catch (auditError) {
      console.error("[audit] Failed to log verification:", auditError)
    }

    return NextResponse.json({ 
      success: true,
      verified: true,
      message: "Compte vérifié avec succès. Vous pouvez maintenant utiliser la plateforme."
    }, { status: 200 })
  } catch (error) {
    console.error("[verification/verify-code] Error:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la vérification du code"
    }, { status: 500 })
  }
}

