import { NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"

/**
 * Check configuration without exposing sensitive keys
 * GET /api/test/config
 */
export async function GET() {
  const ventAgentUrl = process.env.NEXT_PUBLIC_VENT_AGENT_URL || process.env.VENT_AGENT_URL || ""
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  const ocrSpaceKey = process.env.OCR_SPACE_KEY || ""
  const llmProvider = process.env.LLM_PROVIDER || process.env.NEXT_PUBLIC_LLM_PROVIDER || "gemini"
  const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ""

  return NextResponse.json({
    configuration: {
      ventAgentUrl: ventAgentUrl || "❌ NOT CONFIGURED",
      geminiKey: geminiKey ? "✅ CONFIGURED" : "❌ NOT CONFIGURED",
      ocrSpaceKey: ocrSpaceKey ? "✅ CONFIGURED" : "❌ NOT CONFIGURED",
      openaiKey: openaiKey ? "✅ CONFIGURED" : "❌ NOT CONFIGURED",
      llmProvider,
    },
    recommendations: [
      !ventAgentUrl && "⚠️ Configure VENT_AGENT_URL or NEXT_PUBLIC_VENT_AGENT_URL (e.g., http://localhost:3001)",
      !geminiKey && !ocrSpaceKey && "⚠️ Configure GEMINI_API_KEY or OCR_SPACE_KEY for extraction",
      ventAgentUrl && "✅ VENT_AGENT_URL is configured - make sure the agent is running",
    ].filter(Boolean),
    nextSteps: [
      ventAgentUrl ? "Test agent: curl " + ventAgentUrl + "/health" : "Start the ventilation agent server",
      geminiKey || ocrSpaceKey ? "Extraction should work" : "Configure at least one extraction provider",
    ],
  })
}






