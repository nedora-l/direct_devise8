import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as fs from "fs"
import * as path from "path"
export const runtime = "nodejs"

/**
 * Migration endpoint to add contentBase64 to documents missing it
 * POST /api/admin/migrate-documents?companyId=xxx
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
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { documents: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 })
    }

    const documentsWithoutContent = company.documents.filter(d => !d.contentBase64)
    const baseDir = path.join(process.cwd(), "testing_files")
    
    // Mapping of document types to possible file names
    const fileMapping: Record<string, string[]> = {
      rc: ["RC.txt", "Registre_de_Commerce_RC.pdf"],
      statuts: ["Statuts_societe.txt"],
      ice: ["Identifiant_Commun_ICE.pdf"],
      patente: ["Patente_Professionnelle.pdf"],
      facture: ["Facture.txt"],
      identity_recto: ["CIN_recto.txt", "Pièce_d'Identité_Dirigeant.pdf"],
      identity_verso: ["CIN_verso.txt"],
      ubo_list: ["Liste_UBO.txt", "Déclaration_UBO.pdf"],
      justificatif_activite: ["Justificatif_d'Activité.pdf"],
    }

    const results = []
    let migrated = 0

    for (const doc of documentsWithoutContent) {
      const possibleFiles = fileMapping[doc.type] || []
      let found = false

      for (const fileName of possibleFiles) {
        const filePath = path.join(baseDir, fileName)
        if (fs.existsSync(filePath)) {
          try {
            const fileBuffer = fs.readFileSync(filePath)
            const base64Content = fileBuffer.toString('base64')
            const mimeType = fileName.endsWith('.txt') 
              ? 'text/plain' 
              : fileName.endsWith('.pdf') 
              ? 'application/pdf' 
              : 'application/octet-stream'

            await prisma.document.update({
              where: { id: doc.id },
              data: {
                contentBase64: base64Content,
                mimeType,
              },
            })

            results.push({
              documentId: doc.id,
              type: doc.type,
              fileName: doc.fileName,
              migrated: true,
              sourceFile: fileName,
            })
            migrated++
            found = true
            break
          } catch (error) {
            results.push({
              documentId: doc.id,
              type: doc.type,
              fileName: doc.fileName,
              migrated: false,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          }
        }
      }

      if (!found) {
        results.push({
          documentId: doc.id,
          type: doc.type,
          fileName: doc.fileName,
          migrated: false,
          error: "No matching file found in testing_files",
        })
      }
    }

    return NextResponse.json({
      companyId,
      companyName: company.name,
      totalDocuments: company.documents.length,
      documentsWithoutContent: documentsWithoutContent.length,
      migrated,
      results,
    })
  } catch (error) {
    console.error("[admin/migrate-documents] Error:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la migration",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}






