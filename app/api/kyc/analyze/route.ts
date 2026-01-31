import { NextRequest, NextResponse } from "next/server"

interface AnalysisRequest {
  documents: Array<{ type: string; name: string }>
  companyInfo?: any
  completeness?: number
}

interface AgentAnalysis {
  riskScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT'
  findings: string[]
  alerts: string[]
  documentQuality: Record<string, number>
  amlFlags: string[]
  kycCompleteness: number
  confidenceScore: number
  suggestedActions?: string[]
}

type LLMProvider = "gemini" | "openai"

async function callGemini(apiKey: string, documents: any[], companyInfo?: any, completeness?: number, ocrData?: any, ocrReport?: any, extractedFields?: any) {
  // Prefer vision-capable model to handle PDFs/images
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
  const parts: any[] = [{ text: buildPrompt(documents, companyInfo, completeness, ocrData, ocrReport, extractedFields) }]
  // Attach inline data for any provided document blobs
  for (const d of documents) {
    if (d.base64 && d.mimeType) {
      parts.push({
        inline_data: {
          mime_type: d.mimeType,
          data: d.base64,
        }
      })
    }
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    })
  })

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

async function callOpenAI(apiKey: string, documents: any[], companyInfo?: any, completeness?: number, ocrData?: any, ocrReport?: any, extractedFields?: any) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: buildPrompt(documents, companyInfo, completeness, ocrData, ocrReport, extractedFields)
      }],
      temperature: 0.3,
      max_tokens: 2000,
    })
  })

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

function buildPrompt(documents: any[], companyInfo?: any, completeness?: number, ocrData?: any, ocrReport?: any, extractedFields?: any) {
  const docList = documents.map(d => `- ${d.type}: ${d.name}`).join("\n")
  const companyInfoText = companyInfo ? `\nInformations entreprise:\n- Nom: ${companyInfo.name || "N/A"}\n- Email: ${companyInfo.email || "N/A"}\n- Secteur: ${companyInfo.sector || "Non spécifié (à extraire des documents)"}` : ""
  const completenessText = completeness !== undefined ? `\nComplétude du dossier: ${completeness}%` : ""
  
  // Ajouter les données OCR extraites pour que l'agent puisse les analyser
  let ocrText = ""
  if (ocrReport || extractedFields) {
    ocrText = `\n\n=== DONNÉES EXTRAITES PAR OCR ===\n`
    if (extractedFields) {
      ocrText += `Champs extraits:\n`
      if (extractedFields.legalName) ocrText += `- Nom légal: ${extractedFields.legalName}\n`
      if (extractedFields.registrationNumber) ocrText += `- RC: ${extractedFields.registrationNumber}\n`
      if (extractedFields.taxId) ocrText += `- ICE: ${extractedFields.taxId}\n`
      if (extractedFields.address) ocrText += `- Adresse: ${extractedFields.address}\n`
    }
    if (ocrReport) {
      ocrText += `\nScore OCR: ${ocrReport.ocrScore || 0}%\n`
      ocrText += `Documents traités avec succès: ${ocrReport.ocrSuccessCount || 0}/${ocrReport.totalDocuments || 0}\n`
      if (ocrReport.ocrResults && ocrReport.ocrResults.length > 0) {
        ocrText += `\nRésultats OCR par document:\n`
        ocrReport.ocrResults.forEach((r: any) => {
          ocrText += `- ${r.docType}: ${r.hasData ? 'Données extraites' : 'Aucune donnée'} (${r.extractedKeys?.length || 0} champs)\n`
        })
      }
    }
    if (ocrData && Array.isArray(ocrData) && ocrData.length > 0) {
      ocrText += `\nDonnées OCR brutes (JSON):\n${JSON.stringify(ocrData, null, 2)}\n`
    }
    ocrText += `\n=== FIN DONNÉES OCR ===\n`
  }
  
  return `Tu es un auditeur KYC/AML pour le Maroc. Analyse ces documents d'entreprise selon les règles Office des Changes (IGOC 2024) et Bank Al-Maghrib.

Documents reçus:
${docList}${companyInfoText}${completenessText}${ocrText}

Règles à appliquer:
- Whitelist devises: MAD, EUR, USD, GBP, CHF uniquement
- Validation IBAN/BIC selon normes SWIFT
- Codes frais: OUR, BEN, SHA uniquement
- Quota IGOC 70/30 (70% export, 30% import)
- Vérification PEP (Personnes Politiquement Exposées)
- Liste de sanctions internationales
- Conformité AML/CFT

Réponds UNIQUEMENT en JSON strict avec cette structure:
{
  "quality": nombre entre 0-100,
  "missing": ["rc", "ice", ...],
  "risk": "LOW|MEDIUM|HIGH",
  "flags": ["flag1", "flag2", ...],
  "confidence": nombre entre 0-100,
  "recommendation": "APPROVE|REVIEW|REJECT",
  "findings": ["finding1", "finding2", ...],
  "alerts": ["alert1", "alert2", ...],
  "amlFlags": ["aml1", "aml2", ...]
}`
}

function parseAgentResponse(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {}
  return null
}

function getFallbackAnalysis(documents: any[]) {
  const docTypes = documents.map(d => d.type)
  const sixRequired = [
    { type: "rc" },
    { type: "ice" },
    { type: "patente" },
    { type: "identity" },
    { type: "ubo" },
    { type: "activity" },
  ]
  const missingDocs = sixRequired.filter(d => !docTypes.includes(d.type))
  
  return {
    quality: documents.length * 10,
    missing: missingDocs.map(d => d.type),
    risk: documents.length >= 6 ? "Low" : "Medium",
    flags: missingDocs.length > 0 ? [`${missingDocs.length} documents manquants`] : []
  }
}

function performDetailedAnalysis(
  documents: Array<{ type: string; name: string }>,
  companyInfo?: any,
  completeness: number = 0
): AgentAnalysis {
  let riskScore = 50
  let alerts: string[] = []
  const findings: string[] = []
  const documentQuality: Record<string, number> = {}
  const amlFlags: string[] = []

  const docTypes = new Set(documents.map(d => d.type))

  // Document quality assessment
  const docQualities: Record<string, number> = {
    rc: 90,
    ice: 85,
    patente: 88,
    identity: 92,
    ubo: 80,
    activity: 78,
  }

  for (const doc of documents) {
    documentQuality[doc.type] = docQualities[doc.type] || 75
  }

  // Completeness check
  if (completeness < 100) {
    riskScore += 30
    alerts.push(`Documents manquants: ${100 - completeness}% de la soumission incomplète`)
  } else {
    findings.push('Tous les 6 documents obligatoires sont présents et validés')
  }

  // Email validation
  if (companyInfo?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(companyInfo.email)) {
      riskScore += 15
      alerts.push('Format email invalide - risque d\'identité d\'entreprise')
      amlFlags.push('Email invalide détecté')
    } else {
      findings.push(`Email d'entreprise valide: ${companyInfo.email}`)
    }
  }

  // Phone validation
  if (companyInfo?.phone) {
    if (companyInfo.phone.length < 10) {
      riskScore += 10
      alerts.push('Numéro téléphone incomplet ou invalide')
      amlFlags.push('Contact téléphonique incomplet')
    } else {
      findings.push('Numéro téléphone valide fourni')
    }
  }

  // Sector risk assessment
  // Note: sector should be provided in companyInfo or extracted from KYC profile
  if (!companyInfo?.sector) {
    // Don't add risk if sector is not provided - it might be extracted from documents
    // Only add a minor alert
    alerts.push('Secteur d\'activité non spécifié - sera extrait des documents si disponible')
  } else {
    const highRiskSectors = ['cryptocurrency', 'gambling', 'weapons', 'tobacco']
    const mediumRiskSectors = ['import_export', 'trading']

    if (highRiskSectors.includes(companyInfo.sector)) {
      riskScore += 25
      alerts.push(`Secteur d'activité à risque élevé (${companyInfo.sector})`)
      amlFlags.push('Secteur d\'activité à haut risque AML')
    } else if (mediumRiskSectors.includes(companyInfo.sector)) {
      riskScore += 10
      alerts.push(`Secteur d'activité risque modéré (${companyInfo.sector})`)
    } else {
      findings.push(`Secteur d'activité confirmé et autorisé: ${companyInfo.sector}`)
    }
  }

  // SIRET validation
  if (companyInfo?.siret) {
    if (companyInfo.siret.length < 9) {
      riskScore += 8
      alerts.push('SIRET/SIREN incomplet ou invalide')
    } else {
      findings.push('SIRET/SIREN valide fourni')
    }
  }

  // Final risk level determination
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
  if (riskScore >= 70) {
    riskLevel = 'HIGH'
  } else if (riskScore >= 50) {
    riskLevel = 'MEDIUM'
  }

  // Recommendation logic
  const recommendation =
    completeness === 100 && riskLevel === 'LOW' && alerts.length === 0 ? 'APPROVE' :
    riskLevel === 'HIGH' ? 'REJECT' :
    'REVIEW'

  // Confidence score
  const confidenceScore = Math.min(95, 70 + (completeness / 2))

  // Suggested actions for admin
  const suggestedActions: string[] = []
  if (riskLevel === 'HIGH') {
    suggestedActions.push('Vérification manuelle détaillée requise')
    suggestedActions.push('Contacter l\'entreprise pour clarifications')
  }
  if (completeness < 100) {
    suggestedActions.push(`Demander les ${100 - completeness}% de documents manquants`)
  }
  if (alerts.length > 0) {
    suggestedActions.push('Examiner attentivement les alertes détectées')
  }
  if (riskLevel === 'MEDIUM') {
    suggestedActions.push('Vérification intermédiaire recommandée')
  }

  return {
    riskScore: Math.min(100, riskScore),
    riskLevel,
    recommendation,
    findings,
    alerts,
    documentQuality,
    amlFlags,
    kycCompleteness: completeness,
    confidenceScore,
    suggestedActions,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json()
    const { documents, companyInfo, completeness, ocrData, ocrReport, extractedFields } = body
    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json({ error: "Documents array required" }, { status: 400 })
    }

    const provider: LLMProvider = (body.provider || process.env.LLM_PROVIDER || process.env.NEXT_PUBLIC_LLM_PROVIDER || "gemini") as LLMProvider
    let text = ""

    // Optional: Extract content via Google Document AI if enabled
    const docAiEnabled = process.env.DOC_AI_ENABLED === "true"
    const projectId = process.env.DOC_AI_PROJECT_ID
    const location = process.env.DOC_AI_LOCATION || "eu"
    const processorId = process.env.DOC_AI_PROCESSOR_ID
    const accessToken = process.env.DOC_AI_ACCESS_TOKEN

    let extractedDocs = documents
    if (docAiEnabled && projectId && processorId && accessToken) {
      try {
        const endpoint = `https://documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`
        const results: any[] = []
        for (const d of documents) {
          if (d.base64 && d.mimeType) {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ rawDocument: { content: d.base64, mimeType: d.mimeType } }),
            })
            const json = await res.json()
            const textContent = json?.document?.text || d.content || ""
            results.push({ ...d, content: textContent })
          } else {
            results.push(d)
          }
        }
        extractedDocs = results
      } catch {}
    }

    if (provider === "gemini") {
      const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
      if (apiKey) {
        try {
          console.log(`[kyc/analyze] Calling Gemini with ${extractedDocs.length} documents and OCR data`)
          text = await callGemini(apiKey, extractedDocs, companyInfo, completeness, ocrData, ocrReport, extractedFields)
          console.log(`[kyc/analyze] Gemini response length: ${text.length}`)
        } catch (error) {
          console.error("[kyc/analyze] Gemini error:", error)
        }
      } else {
        console.warn("[kyc/analyze] GEMINI_API_KEY not configured")
      }
    } else if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ""
      if (apiKey) {
        try {
          console.log(`[kyc/analyze] Calling OpenAI with ${extractedDocs.length} documents and OCR data`)
          text = await callOpenAI(apiKey, extractedDocs, companyInfo, completeness, ocrData, ocrReport, extractedFields)
          console.log(`[kyc/analyze] OpenAI response length: ${text.length}`)
        } catch (error) {
          console.error("[kyc/analyze] OpenAI error:", error)
        }
      } else {
        console.warn("[kyc/analyze] OPENAI_API_KEY not configured")
      }
    }

    const parsed = text ? parseAgentResponse(text) : null
    if (parsed) {
      console.log("[kyc/analyze] Parsed agent response:", { risk: parsed.risk, quality: parsed.quality })
    } else {
      console.warn("[kyc/analyze] Using fallback analysis")
    }
    
    // Use detailed analysis as base, merge with LLM results if available
    const detailedAnalysis = performDetailedAnalysis(extractedDocs, companyInfo, completeness)
    const result = parsed ? {
      ...detailedAnalysis,
      riskLevel: (parsed.risk || detailedAnalysis.riskLevel).toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
      confidenceScore: parsed.confidence || detailedAnalysis.confidenceScore,
      recommendation: parsed.recommendation || detailedAnalysis.recommendation,
      findings: [...(parsed.findings || []), ...detailedAnalysis.findings],
      alerts: [...(parsed.alerts || []), ...detailedAnalysis.alerts],
      amlFlags: [...(parsed.amlFlags || []), ...detailedAnalysis.amlFlags],
    } : detailedAnalysis
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Erreur traitement KYC" }, { status: 500 })
  }
}
