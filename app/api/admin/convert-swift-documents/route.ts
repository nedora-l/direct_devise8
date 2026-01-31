import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { extractWithOCRSpace } from "@/lib/ocr-space"
export const runtime = "nodejs"

/**
 * Convert SWIFT documents to Swift table entries
 * POST /api/admin/convert-swift-documents?companyId=xxx
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session as any).user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const companyId = req.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId requis" }, { status: 400 })
    }

    const prisma = getPrisma()
    
    // Find SWIFT documents
    const swiftDocuments = await prisma.document.findMany({
      where: {
        companyId,
        OR: [
          { type: "swift" },
          { type: "swift_document" },
          { fileName: { contains: "SWIFT", mode: "insensitive" } },
        ],
      },
    })

    if (swiftDocuments.length === 0) {
      return NextResponse.json({ 
        message: "Aucun document SWIFT trouvé",
        converted: 0 
      })
    }

    const converted: any[] = []
    const errors: any[] = []

    for (const doc of swiftDocuments) {
      if (!doc.contentBase64) {
        errors.push({ documentId: doc.id, fileName: doc.fileName, error: "Pas de contenu base64" })
        continue
      }

      try {
        let swiftText = ""
        let parseResult: any = null

        // Try to extract text using OCR.space first (fallback when vent agent is down)
        const ocrSpaceKey = process.env.OCR_SPACE_KEY
        if (ocrSpaceKey) {
          try {
            console.log(`[convert-swift] Extracting text with OCR.space for ${doc.fileName}`)
            swiftText = await extractWithOCRSpace(
              doc.contentBase64,
              doc.mimeType || "application/pdf",
              doc.fileName
            )
            console.log(`[convert-swift] OCR.space extracted ${swiftText.length} characters`)
          } catch (ocrError) {
            console.warn(`[convert-swift] OCR.space failed for ${doc.fileName}:`, ocrError)
          }
        }

        // Parse SWIFT using the parse API (with extracted text if available)
        try {
          const parseResponse = await fetch(`${req.nextUrl.origin}/api/swift/parse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: swiftText, // Use OCR.space text if available
              fileBase64: doc.contentBase64,
              mimeType: doc.mimeType || "application/pdf",
            }),
          })

          if (parseResponse.ok) {
            parseResult = await parseResponse.json()
          } else {
            const errorData = await parseResponse.json().catch(() => ({}))
            console.warn(`[convert-swift] Parse API failed:`, errorData)
          }
        } catch (parseError) {
          console.warn(`[convert-swift] Parse API error:`, parseError)
        }

        // If parse API failed but we have text, try direct parsing
        if (!parseResult?.data && swiftText && swiftText.length > 50) {
          console.log(`[convert-swift] Attempting direct SWIFT parsing from extracted text`)
          try {
            const { parseSWIFT } = await import("@/lib/swift-parser")
            const parsed = parseSWIFT(swiftText)
            if (parsed && parsed.reference) {
              parseResult = { data: parsed }
            }
          } catch (directParseError) {
            console.warn(`[convert-swift] Direct parsing failed:`, directParseError)
          }
        }

        if (!parseResult?.data) {
          const errorMsg = swiftText 
            ? `Texte extrait (${swiftText.length} caractères) mais parsing SWIFT échoué. Vérifiez le format du document.`
            : "Aucune donnée extraite. Vérifiez que OCR_SPACE_KEY est configuré et que le document est lisible."
          errors.push({ 
            documentId: doc.id, 
            fileName: doc.fileName, 
            error: errorMsg,
            extractedTextLength: swiftText?.length || 0,
          })
          continue
        }

        const swiftData = parseResult.data
        const reference = swiftData.reference || `SWIFT-${doc.id.substring(0, 8)}`
        const amount = parseFloat(swiftData.amount || "0")
        const currency = swiftData.currency || "EUR"

        // Check if Swift already exists - update if same company, skip if different
        const existing = await prisma.swift.findUnique({
          where: { reference },
        })

        if (existing) {
          if (existing.companyId === companyId) {
            // Same company, same reference - update the existing one
            console.log(`[convert-swift] Updating existing SWIFT ${reference} for company ${companyId}`)
            await prisma.swift.update({
              where: { reference },
              data: {
                amount,
                currency,
                parsedJson: {
                  ...swiftData,
                  sourceDocument: doc.id,
                  sourceFileName: doc.fileName,
                  updatedAt: new Date().toISOString(),
                },
              },
            })
            converted.push({
              documentId: doc.id,
              fileName: doc.fileName,
              swiftId: existing.id,
              reference: existing.reference,
              amount: existing.amount,
              currency: existing.currency,
              action: "updated",
            })
            continue
          } else {
            // Different company - generate new reference
            const newReference = `${reference}-${doc.id.substring(0, 6)}`
            console.log(`[convert-swift] Reference ${reference} exists for different company, using ${newReference}`)
            const swift = await prisma.swift.create({
              data: {
                companyId,
                reference: newReference,
                amount,
                currency,
                parsedJson: {
                  ...swiftData,
                  originalReference: reference,
                  sourceDocument: doc.id,
                  sourceFileName: doc.fileName,
                },
                validated: false,
                adminStatus: "pending",
              },
            })
            converted.push({
              documentId: doc.id,
              fileName: doc.fileName,
              swiftId: swift.id,
              reference: swift.reference,
              amount: swift.amount,
              currency: swift.currency,
              action: "created_with_new_ref",
            })
            continue
          }
        }

        // Create Swift entry
        const swift = await prisma.swift.create({
          data: {
            companyId,
            reference,
            amount,
            currency,
            parsedJson: {
              ...swiftData,
              sourceDocument: doc.id,
              sourceFileName: doc.fileName,
            },
            validated: false,
            adminStatus: "pending",
          },
        })

        converted.push({
          documentId: doc.id,
          fileName: doc.fileName,
          swiftId: swift.id,
          reference: swift.reference,
          amount: swift.amount,
          currency: swift.currency,
        })
      } catch (error) {
        errors.push({ 
          documentId: doc.id, 
          fileName: doc.fileName, 
          error: error instanceof Error ? error.message : "Erreur inconnue" 
        })
      }
    }

    return NextResponse.json({
      converted: converted.length,
      errors: errors.length,
      details: {
        converted,
        errors,
      },
    })
  } catch (error) {
    console.error("[admin/convert-swift-documents] Error:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la conversion",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

