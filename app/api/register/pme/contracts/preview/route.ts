import { NextRequest, NextResponse } from "next/server"
import { documentTemplates, DocumentType } from "@/lib/document-templates"

export async function GET(req: NextRequest) {
  try {
    const contractType = req.nextUrl.searchParams.get("type")
    
    if (!contractType) {
      return NextResponse.json({ error: "Type de contrat requis" }, { status: 400 })
    }

    // Map contract types to document templates
    const templateMap: Record<string, DocumentType> = {
      saas: "saas_contract",
      eligibility: "eligibility_declaration",
      mandate: "authorization_mandate",
    }

    const docType = templateMap[contractType]
    if (!docType || !documentTemplates[docType]) {
      // Return a simple text contract if template doesn't exist
      const contractText = getContractText(contractType)
      return new NextResponse(contractText, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `inline; filename="contrat-${contractType}.txt"`,
        },
      })
    }

    const content = documentTemplates[docType]({
      company: "Votre Entreprise",
      registrationNumber: "—",
      address: "—",
      representative: "—",
      representativeTitle: "Directeur Général",
      city: "Casablanca",
    })

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="contrat-${contractType}.txt"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la génération du contrat" }, { status: 500 })
  }
}

function getContractText(contractType: string): string {
  const contracts: Record<string, string> = {
    saas: `CONTRAT DE PRESTATION DE SERVICES SAAS
Direct Devise - Plateforme de Change

1. OBJET
Le présent contrat définit les conditions d'utilisation de la plateforme Direct Devise pour les opérations de change de devises.

2. SERVICES
La plateforme permet aux PME de :
- Uploader des documents SWIFT
- Participer à des enchères de change
- Gérer leurs opérations de change en ligne

3. OBLIGATIONS
L'utilisateur s'engage à fournir des informations exactes et à respecter la réglementation IGOC 2024.

4. CONFIDENTIALITÉ
Toutes les données sont traitées conformément à la réglementation en vigueur.

Date: ${new Date().toLocaleDateString("fr-FR")}
`,
    eligibility: `DÉCLARATION D'ÉLIGIBILITÉ AUX OPÉRATIONS DE CHANGE
Conformité IGOC 2024 - Article 3.2

Je soussigné(e), déclare que mon entreprise est éligible aux opérations de change conformément à la réglementation IGOC 2024.

Mon entreprise respecte les conditions suivantes :
- Activité légale et conforme
- Documents à jour
- Respect des obligations fiscales

Date: ${new Date().toLocaleDateString("fr-FR")}
`,
    mandate: `MANDAT D'AUTORISATION DE CHANGE

Je soussigné(e), autorise Direct Devise à effectuer les opérations de change en mon nom et pour mon compte.

Ce mandat couvre :
- Les opérations de change de devises
- La participation aux enchères
- La gestion des transactions

Date: ${new Date().toLocaleDateString("fr-FR")}
`,
  }

  return contracts[contractType] || "Contrat non disponible"
}






