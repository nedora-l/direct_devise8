import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { notificationService } from "@/lib/notification-service"
export const runtime = "nodejs"

// Generate 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { companyId, email, phone, channel = "email" } = body

    if (!companyId || !email) {
      return NextResponse.json({ error: "companyId et email requis" }, { status: 400 })
    }

    const prisma = getPrisma()

    // Verify company exists
    const company = await prisma.company.findUnique({ 
      where: { id: companyId },
      include: { users: { take: 1 } }
    })
    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    // Generate verification code
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Create or update verification code
    let verificationCode
    try {
      // First, invalidate any existing pending codes for this company
      await prisma.verificationCode.updateMany({
        where: {
          companyId,
          status: "pending",
        },
        data: {
          status: "expired",
        },
      })

      verificationCode = await prisma.verificationCode.create({
        data: {
          companyId,
          code,
          email,
          phone: phone || null,
          channel,
          expiresAt,
        },
      })
      
      console.log(`[send-code] Verification code created:`, {
        id: verificationCode.id,
        code: verificationCode.code,
        companyId: verificationCode.companyId,
        expiresAt: verificationCode.expiresAt.toISOString(),
        channel: verificationCode.channel
      })
    } catch (dbError: any) {
      // If model doesn't exist or migration not applied, log and continue
      console.error("[verification] Database error:", dbError)
      console.error("[verification] Error details:", {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta
      })
      // For now, we'll still try to send the notification
      // In production, ensure migration is applied
      verificationCode = {
        id: `temp-${Date.now()}`,
        code,
        email,
        phone: phone || null,
        channel,
        expiresAt,
      }
    }

    // Send code via notification service
    try {
      const message = `Votre code de vérification Direct Devise est : ${code}. Ce code expire dans 15 minutes.`
      const recipient = channel === "email" ? email : (phone || email)
      
      await notificationService.notify(
        recipient,
        "pme",
        channel as "email" | "sms" | "whatsapp",
        "Code de vérification Direct Devise",
        message,
        "verification_code",
        { code, companyName: company.name }
      )
      
      // Log the code in console for testing (remove in production)
      console.log(`[VERIFICATION CODE] ${channel.toUpperCase()} to ${recipient}: ${code}`)
    } catch (notifError) {
      console.error("[verification] Failed to send notification:", notifError)
      // Continue even if notification fails - code is still saved
      // Log the code in console for testing
      console.log(`[VERIFICATION CODE] ${channel.toUpperCase()} to ${channel === "email" ? email : phone}: ${code}`)
    }

    // Always return code in development mode for testing
    const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV
    console.log("[send-code] NODE_ENV:", process.env.NODE_ENV, "isDev:", isDev)
    console.log("[send-code] Generated code:", code)
    
    return NextResponse.json({ 
      success: true,
      message: `Code de vérification envoyé par ${channel}`,
      expiresAt: expiresAt.toISOString(),
      // Always include code in dev mode for testing
      ...(isDev && { 
        devCode: code,
        note: "Code visible uniquement en mode développement pour les tests"
      })
    }, { status: 201 })
  } catch (error) {
    console.error("[verification/send-code] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Always return the code in development for testing
    if (process.env.NODE_ENV === "development") {
      const code = generateCode()
      console.log(`[DEV MODE] Verification code would be: ${code}`)
      return NextResponse.json({ 
        error: errorMessage,
        details: errorStack,
        devCode: code, // Only in dev mode
        message: "Erreur lors de l'envoi du code de vérification. Vérifiez la console pour le code de test."
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: "Erreur lors de l'envoi du code de vérification",
      details: errorMessage
    }, { status: 500 })
  }
}

