import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

interface ExtractedData {
  legalName?: string
  registrationNumber?: string
  taxId?: string
  address?: string
  city?: string
  ocrScore?: number
  agentScore?: number
  finalScore?: number
  ocrData?: any
  agentData?: any
  flags?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { companyId } = body

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

    const documents = company.documents.filter(d => 
      ["rc", "statuts", "ice", "patente"].includes(d.type)
    )

    if (documents.length === 0) {
      return NextResponse.json({ error: "Aucun document à extraire" }, { status: 400 })
    }

    const extractedData: ExtractedData = {
      flags: [],
    }

    // Étape 1 : Extraction OCR
    const ocrResults: any[] = []
    let ocrSuccessCount = 0
    
    for (const doc of documents) {
      if (!doc.contentBase64) continue

      try {
        // Utiliser OCR.space directement (fallback si agent ventilation non disponible)
        const ocrSpaceKey = process.env.OCR_SPACE_KEY
        const ventAgentUrl = process.env.NEXT_PUBLIC_VENT_AGENT_URL || process.env.VENT_AGENT_URL || ""
        
        let ocrResult: any = null
        
        // Essayer d'abord l'agent ventilation s'il est disponible
        if (ventAgentUrl) {
          try {
            console.log(`[kyc/extract] Trying ventilation agent for ${doc.type}: ${doc.fileName}`)
            const ocrResponse = await fetch(`${ventAgentUrl}/ventilation/extract`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Schema-Version": "v2" },
              body: JSON.stringify({
                files: [{
                  name: doc.fileName,
                  base64: doc.contentBase64,
                }],
              }),
              signal: AbortSignal.timeout(10000), // 10 seconds timeout
            })

            if (ocrResponse.ok) {
              ocrResult = await ocrResponse.json()
              console.log(`[kyc/extract] Agent ventilation success for ${doc.type}`)
            } else {
              console.warn(`[kyc/extract] Agent ventilation failed (${ocrResponse.status}), falling back to OCR.space`)
            }
          } catch (ventError) {
            console.warn(`[kyc/extract] Agent ventilation unavailable, using OCR.space:`, ventError instanceof Error ? ventError.message : String(ventError))
          }
        }
        
        // Fallback: utiliser OCR.space directement
        if (!ocrResult && ocrSpaceKey) {
          try {
            console.log(`[kyc/extract] Using OCR.space directly for ${doc.type}: ${doc.fileName}`)
            const { extractWithOCRSpace } = await import("@/lib/ocr-space")
            const extractedText = await extractWithOCRSpace(
              doc.contentBase64,
              doc.mimeType || "application/pdf",
              doc.fileName
            )
            
            // Structure simple pour compatibilité avec le reste du code
            ocrResult = {
              Header: {
                // Essayer d'extraire des infos basiques du texte
                text: extractedText,
              },
              ParsedText: extractedText,
            }
            
            console.log(`[kyc/extract] OCR.space extracted ${extractedText.length} characters for ${doc.type}`)
          } catch (ocrError) {
            console.warn(`[kyc/extract] OCR.space failed for ${doc.type}:`, ocrError instanceof Error ? ocrError.message : String(ocrError))
          }
        }
        
        if (ocrResult) {
          ocrResults.push({ docType: doc.type, data: ocrResult })
          ocrSuccessCount++
          
          console.log(`[kyc/extract] OCR success for ${doc.type}:`, Object.keys(ocrResult))
            
            // Extraire données depuis structure agent ventilation (si disponible)
            if (ocrResult?.Header) {
              if (ocrResult.Header.rc) extractedData.registrationNumber = ocrResult.Header.rc
              if (ocrResult.Header.nom) extractedData.legalName = ocrResult.Header.nom
              if (ocrResult.Header.adresse) extractedData.address = ocrResult.Header.adresse
              if (ocrResult.Header.ice) extractedData.taxId = ocrResult.Header.ice
            }
            
            // Extraire depuis texte brut OCR.space (fallback)
            if (ocrResult?.ParsedText && !extractedData.legalName && !extractedData.registrationNumber) {
              const text = ocrResult.ParsedText
              
              // Extraire RC (format: RC12345 ou RC 12345 ou RC: 12345)
              if (doc.type === "rc") {
                const rcMatch = text.match(/RC\s*:?\s*([A-Z0-9]{4,15})/i)
                if (rcMatch) extractedData.registrationNumber = rcMatch[1].trim()
                
                // Extraire nom d'entreprise
                const namePatterns = [
                  /(?:Raison sociale|Dénomination|Nom)[\s:]+([A-Z][^\n]{5,80})/i,
                  /(?:SARL|SA|SAS|EURL)[\s:]+([A-Z][^\n]{5,80})/i,
                ]
                for (const pattern of namePatterns) {
                  const match = text.match(pattern)
                  if (match) {
                    extractedData.legalName = match[1].trim().split('\n')[0]
                    break
                  }
                }
              }
              
              // Extraire ICE (15 chiffres)
              if (doc.type === "ice" || doc.type === "patente") {
                const iceMatch = text.match(/ICE\s*:?\s*([0-9]{15})/i)
                if (iceMatch) extractedData.taxId = iceMatch[1]
              }
              
              // Extraire adresse
              if (!extractedData.address) {
                const addressMatch = text.match(/(?:Adresse|Siège)[\s:]+([^\n]{10,100})/i)
                if (addressMatch) extractedData.address = addressMatch[1].trim()
              }
            }
        } else {
          console.warn(`[kyc/extract] No OCR result for ${doc.type} - neither agent nor OCR.space worked`)
          // Fallback: extract from company data if available
          if (doc.type === "rc" && company.rc) {
            extractedData.registrationNumber = company.rc
          }
          if ((doc.type === "ice" || doc.type === "patente") && company.ice) {
            extractedData.taxId = company.ice
          }
          if (company.name && !extractedData.legalName) {
            extractedData.legalName = company.name
          }
        }
      } catch (error) {
        console.error(`[kyc/extract] OCR error for ${doc.type}:`, error)
      }
    }

    // Calculer score OCR (basé sur nombre de champs extraits + succès OCR)
    const ocrFields = [
      extractedData.legalName,
      extractedData.registrationNumber,
      extractedData.taxId,
      extractedData.address,
    ].filter(Boolean).length
    
    // Score basé sur champs extraits (60%) + succès OCR (40%)
    const fieldsScore = Math.round((ocrFields / 4) * 100) * 0.6
    const ocrSuccessScore = documents.length > 0 ? Math.round((ocrSuccessCount / documents.length) * 100) * 0.4 : 0
    extractedData.ocrScore = Math.round(fieldsScore + ocrSuccessScore)
    extractedData.ocrData = ocrResults
    
    console.log(`[kyc/extract] OCR Score: ${extractedData.ocrScore}% (fields: ${ocrFields}/4, success: ${ocrSuccessCount}/${documents.length})`)

    // Étape 2 : Validation Agent KYC
    // L'agent doit recevoir les données OCR extraites ET le rapport OCR pour faire son propre scoring
    try {
      console.log(`[kyc/extract] Calling KYC agent for ${documents.length} documents with OCR data`)
      
      // Préparer les données OCR pour l'agent
      const ocrReport = {
        extractedFields: {
          legalName: extractedData.legalName,
          registrationNumber: extractedData.registrationNumber,
          taxId: extractedData.taxId,
          address: extractedData.address,
        },
        ocrResults: ocrResults.map(r => ({
          docType: r.docType,
          extractedKeys: Object.keys(r.data || {}),
          hasData: !!r.data,
        })),
        ocrScore: extractedData.ocrScore,
        ocrSuccessCount,
        totalDocuments: documents.length,
      }
      
      const agentResponse = await fetch(`${req.nextUrl.origin}/api/kyc/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: documents.map(d => ({
            type: d.type,
            name: d.fileName,
            base64: d.contentBase64,
            mimeType: d.mimeType || "application/pdf",
          })),
          companyInfo: {
            name: company.name,
            email: company.users[0]?.email,
            sector: (company.kyc?.profileData as any)?.sector || null,
          },
          completeness: Math.round((documents.length / 6) * 100),
          // Passer les données OCR à l'agent pour qu'il puisse les analyser
          ocrData: extractedData.ocrData,
          ocrReport: ocrReport,
          extractedFields: ocrReport.extractedFields,
        }),
      })

      if (agentResponse.ok) {
        const agentResult = await agentResponse.json()
        extractedData.agentData = agentResult
        
        console.log(`[kyc/extract] Agent result:`, {
          riskLevel: agentResult.riskLevel,
          confidenceScore: agentResult.confidenceScore,
          recommendation: agentResult.recommendation,
        })
        
        // Score agent basé sur l'analyse
        if (agentResult.confidenceScore !== undefined) {
          extractedData.agentScore = agentResult.confidenceScore
        } else if (agentResult.riskLevel) {
          // Fallback: calculer score depuis riskLevel
          const riskScores: Record<string, number> = { LOW: 90, MEDIUM: 70, HIGH: 40 }
          extractedData.agentScore = riskScores[agentResult.riskLevel] || 50
        } else {
          // Fallback basé sur nombre de documents
          extractedData.agentScore = Math.min(100, documents.length * 15)
        }
        
        // Vérifier cohérence entre OCR et Agent
        if (agentResult.findings) {
          const findings = agentResult.findings as string[]
          if (findings.some(f => f.toLowerCase().includes("incohérence") || f.toLowerCase().includes("divergence"))) {
            extractedData.flags?.push("divergence_ocr_agent")
          }
        }
        
        // Ajouter flags AML
        if (agentResult.amlFlags && Array.isArray(agentResult.amlFlags)) {
          extractedData.flags?.push(...agentResult.amlFlags)
        }
      } else {
        console.warn(`[kyc/extract] Agent analysis failed:`, agentResponse.status)
        // Fallback: score basé sur nombre de documents
        extractedData.agentScore = Math.min(100, documents.length * 15)
      }
    } catch (error) {
      console.error("[kyc/extract] Agent analysis error:", error)
      // Fallback: score basé sur nombre de documents
      extractedData.agentScore = Math.min(100, documents.length * 15)
    }

    // Score final (pondération : OCR 40%, Agent 60%)
    extractedData.finalScore = Math.round(
      (extractedData.ocrScore || 0) * 0.4 + (extractedData.agentScore || 0) * 0.6
    )

    console.log(`[kyc/extract] Final scores: OCR=${extractedData.ocrScore}%, Agent=${extractedData.agentScore}%, Final=${extractedData.finalScore}%`)

    return NextResponse.json({ extractedData })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de l'extraction" }, { status: 500 })
  }
}

