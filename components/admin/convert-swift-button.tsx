"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function ConvertSwiftButton({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(false)

  const handleConvert = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/convert-swift-documents?companyId=${companyId}`, {
        method: "POST",
      })
      const result = await response.json()
      console.log("[convert-swift] Result:", result)
      
      if (result.converted > 0) {
        alert(`✅ ${result.converted} document(s) SWIFT converti(s) avec succès!`)
        window.location.reload()
      } else if (result.errors > 0) {
        const errorMessages = result.details?.errors?.map((e: any) => `${e.fileName}: ${e.error}`).join("\n") || "Erreurs inconnues"
        alert(`❌ Erreurs lors de la conversion:\n${errorMessages}`)
      } else {
        alert("ℹ️ Aucun document SWIFT à convertir")
      }
    } catch (error) {
      console.error("[convert-swift] Error:", error)
      alert("❌ Erreur lors de la conversion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      size="sm" 
      variant="outline"
      onClick={handleConvert}
      disabled={loading}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Conversion..." : "Convertir les documents SWIFT"}
    </Button>
  )
}






