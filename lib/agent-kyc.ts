'use client'

import { LLMProvider } from "@/lib/types"

// Agent LLM pour analyse KYC documents
class KYCAgent {
  private provider: LLMProvider

  constructor() {
    this.provider = (process.env.NEXT_PUBLIC_LLM_PROVIDER as LLMProvider) || "gemini"
  }

  async analyzeDocuments(documents: Array<{
    type: string
    name: string
    content?: string
    base64?: string
  }>) {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_VENT_AGENT_URL as string
      if (agentUrl && documents.some(d => !!d.base64)) {
        const scores: Array<{ score: number; status: string; docType: string }> = []
        const findings: string[] = []
        let hasName = false
        let hasAddress = false
        let hasDate = false
        let hasAmount = false
        let hasUBO = false
        let hasSignature = false
        for (const d of documents) {
          if (!d.base64) continue
          const body = { files: [{ name: d.name, base64: d.base64 }] }
          const res = await fetch(`${agentUrl}/ventilation/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Schema-Version': 'v2' },
            body: JSON.stringify(body)
          })
          if (!res.ok) continue
          const json = await res.json()
          if (json && json.KYC) scores.push({ score: json.KYC.score || 0, status: json.KYC.status || '', docType: d.type })
          if (json && json.Header) {
            if (json.Header.nom) hasName = true
            if (json.Header.adresse) hasAddress = true
            if (json.Header.date) hasDate = true
          }
          if (json && json.Footer && typeof json.Footer.TotalGeneralDeclare === 'number' && json.Footer.TotalGeneralDeclare > 0) hasAmount = true
          const textBlob = `${JSON.stringify(json)}`
          if (/UBO|propriétaire bénéficiaire/i.test(textBlob)) hasUBO = true
          if (/signature|signed/i.test(textBlob)) hasSignature = true
        }
        const evidenceCount = [hasName, hasAddress, hasDate, hasAmount, hasUBO, hasSignature].filter(Boolean).length
        const overallScore = Math.min(100, evidenceCount * (100 / 6))
        const quality = Math.min(100, Math.round((documents.length / this.getSixRequiredDocs().length) * 100))
        const docTypes = documents.map(d => d.type)
        const missingDocs = this.getSixRequiredDocs().filter(d => !docTypes.includes(d.type))
        if (missingDocs.length) findings.push(`${missingDocs.length} documents manquants`)
        const risk = overallScore >= 80 ? 'Low' : overallScore >= 50 ? 'Medium' : 'High'
        const kycStatus = overallScore >= 80 ? 'OK - À reviewer' : 'Suspect - Reviewer manuel'
        return { quality, missing: missingDocs.map(d => d.type), risk, flags: findings, kycScore: Math.round(overallScore), kycStatus }
      } else {
        const response = await fetch("/api/kyc/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documents, provider: this.provider })
        })
        if (!response.ok) {
          return this.getFallbackAnalysis(documents)
        }
        const result = await response.json()
        return result
      }
    } catch (error) {
      console.error("[KYC Agent] Erreur analyse:", error)
      return this.getFallbackAnalysis(documents)
    }
  }

  private getFallbackAnalysis(documents: any[]) {
    const docTypes = documents.map(d => d.type)
    const missingDocs = this.getSixRequiredDocs().filter(d => !docTypes.includes(d.type))
    
    return {
      quality: documents.length * 10,
      missing: missingDocs.map(d => d.type),
      risk: documents.length >= 6 ? "Low" : "Medium",
      flags: missingDocs.length > 0 ? [`${missingDocs.length} documents manquants`] : []
    }
  }

  private getSixRequiredDocs() {
    return [
      { type: "rc", label: "Registre de Commerce (RC)" },
      { type: "ice", label: "Identifiant Commun d'Entreprise (ICE)" },
      { type: "patente", label: "Patente Professionnelle" },
      { type: "identity", label: "Pièce d'Identité Responsable" },
      { type: "ubo", label: "Déclaration UBO" },
      { type: "activity", label: "Contrat/Justificatif d'Activité" },
    ]
  }
}

export const kycAgent = new KYCAgent()
