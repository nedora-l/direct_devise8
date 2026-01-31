import { NextResponse } from "next/server"
import { readdirSync } from "fs"
import path from "path"

const TESTING_FILES_DIR = path.join(process.cwd(), "testing_files")

/**
 * GET /api/test-files
 * Liste les fichiers disponibles dans testing_files pour les testeurs.
 */
export async function GET() {
  try {
    const dir = TESTING_FILES_DIR
    const entries = readdirSync(dir, { withFileTypes: true })
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => ({
        name: e.name,
        slug: encodeURIComponent(e.name),
      }))
    return NextResponse.json({ files })
  } catch (err) {
    return NextResponse.json(
      { error: "Dossier testing_files inaccessible" },
      { status: 500 }
    )
  }
}
