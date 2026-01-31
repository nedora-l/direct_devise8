"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, ArrowLeft } from "lucide-react"

type FileEntry = { name: string; slug: string }

export default function FichiersDeTestPage() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/test-files")
      .then((r) => r.json())
      .then((data) => {
        if (data.files) setFiles(data.files)
        else setError(data.error ?? "Erreur inconnue")
      })
      .catch(() => setError("Impossible de charger la liste des fichiers"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b border-border/60 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fichiers de test
            </CardTitle>
            <CardDescription>
              Téléchargez ces fichiers pour tester l&apos;upload, l&apos;OCR et la validation SWIFT / KYC sur la plateforme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {!loading && !error && files.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun fichier disponible.</p>
            )}
            {!loading && !error && files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li
                    key={f.slug}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
                  >
                    <span className="text-sm font-medium truncate" title={f.name}>
                      {f.name}
                    </span>
                    <a href={`/api/test-files/${f.slug}`} download={f.name}>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
