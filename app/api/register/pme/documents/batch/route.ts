import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { audit } from "@/lib/audit-logger"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  console.log("[api/documents/batch] Request received")
  
  try {
    const body = await req.json()
    const { companyId, documents } = body

    console.log("[api/documents/batch] Request body:", {
      companyId,
      documentsCount: documents?.length,
      hasDocuments: !!documents,
      isArray: Array.isArray(documents)
    })

    if (!companyId || !documents || !Array.isArray(documents) || documents.length === 0) {
      console.error("[api/documents/batch] Validation failed:", {
        hasCompanyId: !!companyId,
        hasDocuments: !!documents,
        isArray: Array.isArray(documents),
        length: documents?.length
      })
      return NextResponse.json({ error: "Données manquantes ou invalides" }, { status: 400 })
    }

    const prisma = getPrisma()
    console.log("[api/documents/batch] Prisma client obtained")

    // Verify company exists and get user
    console.log("[api/documents/batch] Looking up company:", companyId)
    const company = await prisma.company.findUnique({ 
      where: { id: companyId },
      include: { users: { take: 1 } }
    })
    
    if (!company) {
      console.error("[api/documents/batch] Company not found:", companyId)
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    console.log("[api/documents/batch] Company found:", company.name)
    const userId = company.users[0]?.id || companyId
    console.log("[api/documents/batch] Using userId:", userId)

    // Create all documents in batch
    console.log("[api/documents/batch] Creating", documents.length, "documents...")
    const createdDocuments = await Promise.all(
      documents.map(async (doc: { type: string; fileName: string; mimeType?: string; contentBase64: string }, index: number) => {
        console.log(`[api/documents/batch] Creating document ${index + 1}/${documents.length}:`, {
          type: doc.type,
          fileName: doc.fileName,
          hasContent: !!doc.contentBase64,
          contentLength: doc.contentBase64?.length || 0
        })
        
        try {
          // If it's a SWIFT document, don't create it as a regular document
          // It will be handled separately by the SWIFT upload flow
          if (doc.type === "swift") {
            console.log(`[api/documents/batch] SWIFT document detected, skipping regular document creation`)
            // Still create the document for reference, but note it's a SWIFT
            const created = await prisma.document.create({
              data: {
                companyId,
                type: "swift_document", // Mark as swift_document to distinguish
                fileName: doc.fileName,
                mimeType: doc.mimeType || "application/pdf",
                contentBase64: doc.contentBase64,
              },
            })
            console.log(`[api/documents/batch] SWIFT document reference created with ID:`, created.id)
            return created
          }
          
          const created = await prisma.document.create({
            data: {
              companyId,
              type: doc.type,
              fileName: doc.fileName,
              mimeType: doc.mimeType || "application/pdf",
              contentBase64: doc.contentBase64,
            },
          })
          console.log(`[api/documents/batch] Document ${index + 1} created with ID:`, created.id)
          return created
        } catch (docError) {
          console.error(`[api/documents/batch] Error creating document ${index + 1}:`, docError)
          throw docError
        }
      })
    )

    console.log("[api/documents/batch] All documents created successfully")

    try {
      audit.log(userId, "pme", "DOCUMENTS_BATCH_UPLOADED", "document", companyId, {
        count: documents.length,
        types: documents.map((d: { type: string }) => d.type),
      })
      console.log("[api/documents/batch] Audit log created")
    } catch (auditError) {
      console.error("[api/documents/batch] Failed to log batch upload:", auditError)
    }

    const response = {
      success: true, 
      documentIds: createdDocuments.map(d => d.id),
      count: createdDocuments.length
    }
    
    console.log("[api/documents/batch] Returning success:", response)
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("[api/documents/batch] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'upload des documents"
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("[api/documents/batch] Error details:", {
      message: errorMessage,
      stack: errorStack
    })
    return NextResponse.json({ 
      error: errorMessage,
      details: errorStack
    }, { status: 500 })
  }
}

