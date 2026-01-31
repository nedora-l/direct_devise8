import { NextRequest, NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import path from "path"

const TESTING_FILES_DIR = path.join(process.cwd(), "testing_files")

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
}

/**
 * GET /api/test-files/[slug]
 * Télécharge un fichier du dossier testing_files (slug = encodeURIComponent(nom du fichier)).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug
  if (!slug) {
    return NextResponse.json({ error: "slug manquant" }, { status: 400 })
  }
  const fileName = decodeURIComponent(slug)
  if (!fileName || fileName.includes("..") || path.isAbsolute(fileName)) {
    return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 })
  }
  const filePath = path.join(TESTING_FILES_DIR, fileName)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
  }
  try {
    const buf = readFileSync(filePath)
    const ext = path.extname(fileName).toLowerCase()
    const contentType = MIME[ext] ?? "application/octet-stream"
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, '\\"')}"`,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la lecture du fichier" },
      { status: 500 }
    )
  }
}
