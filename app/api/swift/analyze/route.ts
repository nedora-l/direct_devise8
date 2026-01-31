import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { parseSWIFT } from "@/lib/swift-parser"
import { ConformityChecker } from "@/lib/conformity-checker"
import { extractWithOCRSpace } from "@/lib/ocr-space"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { swiftId } = body

    if (!swiftId) {
      return NextResponse.json({ error: "swiftId requis" }, { status: 400 })
    }

    const prisma = getPrisma()
    const swift = await prisma.swift.findUnique({
      where: { id: swiftId },
      include: { company: { include: { kyc: true } } },
    })

    if (!swift) {
      return NextResponse.json({ error: "SWIFT non trouvé" }, { status: 404 })
    }

    const parsedData = swift.parsedJson as any
    const rawContent = parsedData?.rawContent || JSON.stringify(parsedData)
    
    // Parse and validate SWIFT
    const validation = parseSWIFT(rawContent)
    
    // Calculate real OCR score based on document extraction
    let ocrScore = 0
    let ocrExtractedText = ""
    let ocrSuccess = false
    
    // Try to get source document and extract with OCR.space
    const sourceDocumentId = parsedData?.sourceDocument
    if (sourceDocumentId) {
      try {
        const sourceDoc = await prisma.document.findUnique({
          where: { id: sourceDocumentId },
          select: { contentBase64: true, mimeType: true, fileName: true },
        })
        
        if (sourceDoc?.contentBase64) {
          console.log(`[swift/analyze] Extracting OCR from source document ${sourceDocumentId}`)
          try {
            ocrExtractedText = await extractWithOCRSpace(
              sourceDoc.contentBase64,
              sourceDoc.mimeType || "application/pdf",
              sourceDoc.fileName
            )
            ocrSuccess = true
            console.log(`[swift/analyze] OCR extracted ${ocrExtractedText.length} characters`)
          } catch (ocrError) {
            console.warn(`[swift/analyze] OCR.space failed:`, ocrError)
          }
        }
      } catch (docError) {
        console.warn(`[swift/analyze] Could not fetch source document:`, docError)
      }
    }
    
    // Calculate OCR score based on extraction quality and field presence
    if (ocrSuccess && ocrExtractedText.length > 100) {
      // Base score from extraction success
      ocrScore = 60
      
      // Check for SWIFT field presence in extracted text
      const requiredFields = [
        { pattern: /:20:/i, name: "Reference" },
        { pattern: /:32A:/i, name: "Date/Amount" },
        { pattern: /:50[AK]?:/i, name: "Ordering Customer" },
        { pattern: /:59[AK]?:/i, name: "Beneficiary" },
        { pattern: /:71A:/i, name: "Charges" },
      ]
      
      const foundFields = requiredFields.filter(f => f.pattern.test(ocrExtractedText)).length
      const fieldScore = Math.round((foundFields / requiredFields.length) * 30)
      
      // Check if extracted text contains key SWIFT data
      const hasAmount = /(\d+[,.]?\d*)\s*(EUR|USD|GBP|MAD)/i.test(ocrExtractedText)
      const hasIBAN = /[A-Z]{2}\d{2}[A-Z0-9]{1,30}/i.test(ocrExtractedText)
      const hasBIC = /[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}?/i.test(ocrExtractedText)
      
      const dataScore = (hasAmount ? 5 : 0) + (hasIBAN ? 3 : 0) + (hasBIC ? 2 : 0)
      
      ocrScore = Math.min(100, ocrScore + fieldScore + dataScore)
    } else {
      // Fallback: calculate based on validation and parsed data quality
      const hasRequiredFields = !!(
        parsedData?.reference &&
        parsedData?.amount &&
        parsedData?.currency &&
        (parsedData?.senderIban || parsedData?.senderBic) &&
        (parsedData?.beneficiaryIban || parsedData?.beneficiaryBic)
      )
      
      if (validation.valid && hasRequiredFields) {
        ocrScore = 85
      } else {
        // Penalize based on errors, but don't go below 0
        const errorPenalty = Math.min(85, validation.errors.length * 10)
        const fieldPenalty = hasRequiredFields ? 0 : 20
        ocrScore = Math.max(0, 85 - errorPenalty - fieldPenalty)
      }
    }
    
    // Calculate Agent score (simplified - in production, call real agent)
    const agentScore = validation.valid ? 90 : 70
    
    // Calculate AML score using ConformityChecker
    const amlAssessment = ConformityChecker.assessSwift({
      amount: Number(swift.amount || 0),
      currency: String(swift.currency || ""),
      chargesCode: parsedData?.chargesCode || "OUR",
      reference: swift.reference,
    })
    
    const amlScore = amlAssessment.riskScore
    const finalScore = Math.round(ocrScore * 0.4 + agentScore * 0.6)
    
    // Build detailed report
    const report = {
      ocr: {
        score: ocrScore,
        valid: validation.valid,
        errors: validation.errors,
        extractedFields: parsedData || {},
        ocrExtracted: ocrSuccess,
        ocrTextLength: ocrExtractedText.length,
      },
      agent: {
        score: agentScore,
        validation: validation.valid,
        confidence: agentScore >= 80 ? "high" : agentScore >= 50 ? "medium" : "low",
        findings: validation.valid 
          ? ["SWIFT valide", "Tous les champs requis présents"]
          : ["SWIFT invalide", ...validation.errors],
      },
      aml: {
        score: amlScore,
        riskLevel: amlAssessment.riskLevel,
        flags: amlAssessment.flags,
      },
      combined: {
        finalScore,
        recommendation: finalScore >= 80 ? "Approuver" : finalScore >= 50 ? "Révision requise" : "Rejeter",
        summary: `Score final: ${finalScore}% (OCR: ${ocrScore}%, Agent: ${agentScore}%, AML: ${amlScore}%)`,
      },
    }

    return NextResponse.json({ 
      success: true,
      report,
      swift: {
        id: swift.id,
        reference: swift.reference,
        amount: swift.amount,
        currency: swift.currency,
      }
    })
  } catch (error) {
    console.error("[swift/analyze] Error:", error)
    return NextResponse.json({ 
      error: "Erreur lors de l'analyse du SWIFT"
    }, { status: 500 })
  }
}
