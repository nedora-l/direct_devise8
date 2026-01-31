import { NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"

/**
 * Test if ventilation agent is accessible
 * GET /api/test/vent-agent
 */
export async function GET(req: NextRequest) {
  const ventAgentUrl = process.env.NEXT_PUBLIC_VENT_AGENT_URL || process.env.VENT_AGENT_URL || ""
  
  if (!ventAgentUrl) {
    return NextResponse.json({
      configured: false,
      error: "VENT_AGENT_URL not configured",
      recommendation: "Set VENT_AGENT_URL or NEXT_PUBLIC_VENT_AGENT_URL in .env.local",
    })
  }

  try {
    // Test health endpoint first
    const healthUrl = `${ventAgentUrl}/health`
    console.log("[test/vent-agent] Testing health endpoint:", healthUrl)
    
    const healthResponse = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })

    if (healthResponse.ok) {
      const healthData = await healthResponse.json().catch(() => ({}))
      return NextResponse.json({
        configured: true,
        url: ventAgentUrl,
        health: "OK",
        healthData,
        message: "Agent ventilation is running and accessible",
      })
    } else {
      return NextResponse.json({
        configured: true,
        url: ventAgentUrl,
        health: "ERROR",
        status: healthResponse.status,
        statusText: healthResponse.statusText,
        error: "Health endpoint returned error",
        recommendation: "Check if the agent server is running on " + ventAgentUrl,
      })
    }
  } catch (error) {
    return NextResponse.json({
      configured: true,
      url: ventAgentUrl,
      health: "UNAVAILABLE",
      error: error instanceof Error ? error.message : "Connection failed",
      recommendation: "Make sure the agent server is running: " + ventAgentUrl,
      details: error instanceof Error ? error.stack : undefined,
    })
  }
}






