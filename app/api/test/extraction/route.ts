import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
export const runtime = "nodejs"

/**
 * Test endpoint to check extraction setup
 * GET /api/test/extraction?companyId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId requis" }, { status: 400 })
    }

    const prisma = getPrisma()
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { 
        documents: true,
        users: { take: 1 }
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    // Check environment variables
    const ventAgentUrl = process.env.NEXT_PUBLIC_VENT_AGENT_URL || process.env.VENT_AGENT_URL || ""
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
    const ocrSpaceKey = process.env.OCR_SPACE_KEY || ""
    const llmProvider = process.env.LLM_PROVIDER || process.env.NEXT_PUBLIC_LLM_PROVIDER || "gemini"

    // Check documents
    const documents = company.documents.filter(d => 
      ["rc", "statuts", "ice", "patente"].includes(d.type)
    )

    const docStatus = documents.map(d => ({
      type: d.type,
      fileName: d.fileName,
      hasContent: !!d.contentBase64,
      contentLength: d.contentBase64?.length || 0,
      mimeType: d.mimeType,
    }))

    // Test VENT_AGENT_URL if configured
    let ventAgentTest = null
    if (ventAgentUrl && documents.length > 0 && documents[0].contentBase64) {
      try {
        const testResponse = await fetch(`${ventAgentUrl}/ventilation/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Schema-Version": "v2" },
          body: JSON.stringify({
            files: [{
              name: documents[0].fileName,
              base64: documents[0].contentBase64,
            }],
          }),
        })
        ventAgentTest = {
          status: testResponse.status,
          ok: testResponse.ok,
          error: testResponse.ok ? null : await testResponse.text().catch(() => "Unknown error"),
        }
      } catch (error) {
        ventAgentTest = {
          error: error instanceof Error ? error.message : "Connection failed",
        }
      }
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        email: company.users[0]?.email,
      },
      environment: {
        ventAgentUrl: ventAgentUrl || "NOT CONFIGURED",
        geminiKey: geminiKey ? "CONFIGURED" : "NOT CONFIGURED",
        ocrSpaceKey: ocrSpaceKey ? "CONFIGURED" : "NOT CONFIGURED",
        llmProvider,
      },
      documents: {
        total: company.documents.length,
        kycRelevant: documents.length,
        status: docStatus,
      },
      ventAgentTest,
      recommendations: [
        !ventAgentUrl && "Configure VENT_AGENT_URL or NEXT_PUBLIC_VENT_AGENT_URL",
        documents.length === 0 && "No KYC documents found (rc, statuts, ice, patente)",
        documents.some(d => !d.contentBase64) && "Some documents missing contentBase64",
        !geminiKey && !ocrSpaceKey && "Configure GEMINI_API_KEY or OCR_SPACE_KEY",
      ].filter(Boolean),
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Erreur lors du test",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

