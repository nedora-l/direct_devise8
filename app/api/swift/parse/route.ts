import { NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { parseSWIFT } from "@/lib/swift-parser"
import { audit } from "@/lib/audit-logger"
import type { SWIFTData } from "@/lib/types"
import FormData from "form-data"
import IBAN from "iban"
import { PROMPT_VERSION } from "@/lib/prompts"
import { extractWithOCRSpace } from "@/lib/ocr-space"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { content, userId, fileBase64, mimeType, fileName, geminiKey: geminiKeyOverride, llmProvider, openaiKey } = body
    
    // Debug logs
    console.log("[SWIFT PARSE] Request received:", {
      hasFileBase64: !!fileBase64,
      fileBase64Length: fileBase64?.length || 0,
      mimeType,
      fileName,
      hasOCRSpaceKey: !!process.env.OCR_SPACE_KEY,
    })

    // Robustly derive textual content from request body
    let text: string = ""
    if (typeof content === "string") {
      text = content
    } else if (content && typeof (content as any).text === "string") {
      // Some clients send { text: "..." }
      text = String((content as any).text)
    } else if (Array.isArray(content)) {
      // If content is an array of lines
      text = (content as any).join("\n")
    } else if (content) {
      // Fallback stringification
      const str = String(content)
      // Guard against generic "[object Object]" which indicates wrong shape
      text = str === "[object Object]" ? "" : str
    }

    // Preferred: Agent unique extraction via LLM when PDF/image provided
    const provider = ((llmProvider || process.env.LLM_PROVIDER) || "").toLowerCase()
    const geminiApiKey = geminiKeyOverride
      || process.env.LLM_API_KEY
      || process.env.GEMINI_API_KEY
      || ""
    const openaiApiKey = openaiKey || process.env.OPENAI_API_KEY || ""
    const ventAgentUrl = process.env.NEXT_PUBLIC_VENT_AGENT_URL || process.env.VENT_AGENT_URL || ""

    function tryParseJson(raw: string): any | null {
      if (!raw) return null
      // Support JSON with code fences or extra text
      const first = raw.indexOf("{")
      const last = raw.lastIndexOf("}")
      if (first >= 0 && last > first) {
        const slice = raw.slice(first, last + 1)
        try { return JSON.parse(slice) } catch {}
      }
      try { return JSON.parse(raw) } catch {}
      return null
    }

    async function extractWithLLM(): Promise<SWIFTData | null> {
      if (!fileBase64 || !mimeType) return null
      // Use Gemini when a Gemini key is available, regardless of env provider
      if (geminiApiKey && (provider === "gemini" || !provider)) {
        try {
          const model = process.env.GEMINI_MODEL || "gemini-1.5-flash"
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`
          const prompt = `Tu es un extracteur SWIFT bancaire. Lis ce document (PDF/image) et renvoie STRICTEMENT un JSON avec ces clés: {"transactionType":"MT103|MT202","reference":"string","date":"YYMMDD","amount":number,"currency":"ISO","senderBic":"string","senderName":"string","senderIban":"string","beneficiaryBic":"string","beneficiaryName":"string","beneficiaryIban":"string","chargesCode":"OUR|BEN|SHA","instructedAmount":"<33B si présent>","notes":"<70 si présent>"}. Ne renvoie rien d'autre, aucun texte hors JSON.`
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: fileBase64 } }
                ]
              }]
            }),
          })
          const data = await resp.json()
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
          const parsed = tryParseJson(raw)
          if (!parsed) return null
          const amountRaw = String(parsed.amount ?? "")
          const s0 = amountRaw.replace(/\s/g, "")
          const hasComma0 = s0.includes(',')
          const hasDot0 = s0.includes('.')
          const amountNorm = (() => {
            if (hasComma0 && hasDot0) {
              const lc = s0.lastIndexOf(',')
              const ld = s0.lastIndexOf('.')
              return lc > ld ? s0.replace(/\./g, '').replace(/,/g, '.') : s0.replace(/,/g, '')
            }
            if (hasComma0 && !hasDot0) return s0.replace(/,/g, '.')
            return s0
          })()
          const currencyNorm = String(parsed.currency || "").toUpperCase()
          const result: SWIFTData = {
            transactionType: String(parsed.transactionType || "MT103"),
            reference: String(parsed.reference || ""),
            date: String(parsed.date || ""),
            amount: amountNorm,
            currency: currencyNorm,
            senderBic: String(parsed.senderBic || ""),
            senderName: String(parsed.senderName || ""),
            senderIban: String(parsed.senderIban || ""),
            beneficiaryBic: String(parsed.beneficiaryBic || ""),
            beneficiaryName: String(parsed.beneficiaryName || ""),
            beneficiaryIban: String(parsed.beneficiaryIban || ""),
            chargesCode: String(parsed.chargesCode || "OUR"),
            instructedAmount: String(parsed.instructedAmount || ""),
            instructedCurrency: String(parsed.instructedCurrency || "").toUpperCase(),
            rawContent: "LLM_EXTRACTED",
          }
          return result
        } catch {
          // fallthrough to other methods
        }
      }
      // Minimal OpenAI Vision support for image/* (PDF non supporté ici)
      if (openaiApiKey && provider === "openai" && mimeType.toLowerCase().startsWith("image/")) {
        try {
          const prompt = `Extract STRICT JSON for SWIFT: {"transactionType":"MT103|MT202","reference":"string","date":"YYMMDD","amount":number,"currency":"ISO","senderBic":"string","senderName":"string","senderIban":"string","beneficiaryBic":"string","beneficiaryName":"string","beneficiaryIban":"string","chargesCode":"OUR|BEN|SHA","instructedAmount":"<33B>","notes":"<70>"}. Nothing else.`
          const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiApiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } }
                ]
              }]
            })
          })
          const json = await resp.json()
          const raw = json?.choices?.[0]?.message?.content || ""
          const parsed = tryParseJson(raw)
          if (!parsed) return null
          const amountRaw = String(parsed.amount ?? "")
          const s1 = amountRaw.replace(/\s/g, "")
          const hasComma1 = s1.includes(',')
          const hasDot1 = s1.includes('.')
          const amountNorm = (() => {
            if (hasComma1 && hasDot1) {
              const lc = s1.lastIndexOf(',')
              const ld = s1.lastIndexOf('.')
              return lc > ld ? s1.replace(/\./g, '').replace(/,/g, '.') : s1.replace(/,/g, '')
            }
            if (hasComma1 && !hasDot1) return s1.replace(/,/g, '.')
            return s1
          })()
          const currencyNorm = String(parsed.currency || "").toUpperCase()
          const result: SWIFTData = {
            transactionType: String(parsed.transactionType || "MT103"),
            reference: String(parsed.reference || ""),
            date: String(parsed.date || ""),
            amount: amountNorm,
            currency: currencyNorm,
            senderBic: String(parsed.senderBic || ""),
            senderName: String(parsed.senderName || ""),
            senderIban: String(parsed.senderIban || ""),
            beneficiaryBic: String(parsed.beneficiaryBic || ""),
            beneficiaryName: String(parsed.beneficiaryName || ""),
            beneficiaryIban: String(parsed.beneficiaryIban || ""),
            chargesCode: String(parsed.chargesCode || "OUR"),
            instructedAmount: String(parsed.instructedAmount || ""),
            instructedCurrency: String(parsed.instructedCurrency || "").toUpperCase(),
            rawContent: "LLM_EXTRACTED",
          }
          return result
        } catch {
          return null
        }
      }
      return null
    }

    // Prefer local OCR agent when available (stable, no CORS from server-side)
    if (!text && fileBase64 && mimeType && ventAgentUrl) {
      try {
        const res = await fetch(`${ventAgentUrl}/ventilation/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Schema-Version': 'v2' },
          body: JSON.stringify({ files: [{ name: 'swift', base64: fileBase64 }] })
        })
        if (res.ok) {
          const j = await res.json()
          const amt = Number(j?.Footer?.TotalGeneralDeclare || 0)
          const curFromAgent = String(j?.Header?.Devise || '').toUpperCase()
          if (amt && amt > 0) {
            const now = new Date()
            const yy = String(now.getFullYear()).slice(-2)
            const mm = String(now.getMonth() + 1).padStart(2, '0')
            const dd = String(now.getDate()).padStart(2, '0')
            const dateYYMMDD = `${yy}${mm}${dd}`
            const cur = curFromAgent || 'EUR'
            text = `:32A:${dateYYMMDD}${cur}${String(amt).replace(/\s/g, '')}`
          }
        }
      } catch {}
    }

    const llmExtracted = await extractWithLLM()
    if (llmExtracted) {
      // Validate localement, mais renvoyer toujours les champs extraits
      const validation = (await import("@/lib/swift-parser")).SWIFTParser.validate(llmExtracted)
      const result = {
        data: llmExtracted,
        valid: validation.valid,
        errors: validation.errors,
      }
      if (result.data) {
        const amt = parseFloat(result.data.amount || "0")
        const allowed30 = Math.round(amt * 0.3)
        const reserve70 = Math.round(amt * 0.7)
        ;(result as any).data.igoc = { allowed30, reserve70 }
      }
      if (userId) {
        // Utiliser l'API de log explicite pour éviter les erreurs d'appel
        audit.log(
          userId,
          "pme",
          "TRANSACTION_INITIATED" as any,
          "swift_message",
          result.data?.reference || "unknown",
          {
            valid: result.valid,
            errorCount: result.errors.length,
          }
        )
      }
      ;(result as any).meta = { provider, promptVersion: PROMPT_VERSION }
      return NextResponse.json(result)
    }

    // PRIORITÉ 1: OCR.space (le plus fiable pour PDF scannés/images)
    if ((!text || (typeof text === "string" && text.trim().length < 50)) && fileBase64 && mimeType && process.env.OCR_SPACE_KEY) {
      try {
        console.log("[SWIFT PARSE] Tentative OCR.space (priorité 1)...")
        const ocrText = await extractWithOCRSpace(fileBase64, mimeType, fileName || "swift.pdf")
        if (ocrText && typeof ocrText === "string" && ocrText.trim().length > 50) {
          text = ocrText
          console.log(`[SWIFT PARSE] OCR.space SUCCESS: ${text.length} chars extraits`)
        } else {
          console.warn(`[SWIFT PARSE] OCR.space returned insufficient text (${ocrText?.length || 0} chars)`)
        }
      } catch (err) {
        console.warn(`[SWIFT PARSE] OCR.space failed:`, err instanceof Error ? err.message : String(err))
      }
    }

    // PRIORITÉ 2: Server-side PDF text extraction (pdf-parse pour PDF texte)
    if (!text && fileBase64 && mimeType && mimeType.toLowerCase().includes("pdf")) {
      try {
        console.log("[SWIFT PARSE] Tentative pdf-parse (priorité 2)...")
        const { default: pdfParse } = await import("pdf-parse")
        const buffer = Buffer.from(fileBase64, "base64")
        const parsed = await pdfParse(buffer)
        const extracted = (parsed as any)?.text || ""
        if (typeof extracted === "string" && extracted.trim().length > 0) {
          text = extracted
          console.log(`[SWIFT PARSE] pdf-parse SUCCESS: ${text.length} chars`)
        }
      } catch (err) {
        console.warn(`[SWIFT PARSE] pdf-parse failed:`, err instanceof Error ? err.message : String(err))
      }
    }

    // Unstructured.io désactivé (utilise uniquement OCR.space)

    const enabled = process.env.DOC_AI_ENABLED === "true"
    const projectId = process.env.DOC_AI_PROJECT_ID
    const location = process.env.DOC_AI_LOCATION || "eu"
    const processorId = process.env.DOC_AI_PROCESSOR_ID
    const accessToken = process.env.DOC_AI_ACCESS_TOKEN

    if (enabled && fileBase64 && mimeType && projectId && processorId && accessToken) {
      try {
        const endpoint = `https://documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`
        const docReq = {
          rawDocument: { content: fileBase64, mimeType },
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(docReq),
        })
        const json = await res.json()
        const extracted = json?.document?.text
        if (typeof extracted === "string" && extracted.length > 0) {
          text = extracted
        }
      } catch {}
    }

    // Gemini Vision fallback for PDFs/images (always if key available)
    if (!text && fileBase64 && mimeType && geminiApiKey) {
      try {
        const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash"
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`
        const prompt = `Tu es un lecteur SWIFT. Extrait strictement en JSON: {amount:string,currency:string,reference:string} depuis ce document (PDF/image). Ne renvoie rien d'autre.`
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: fileBase64 } }
              ]
            }]
          }),
        })
        const data = await resp.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
        if (rawText) {
          try {
            const extracted = tryParseJson(rawText)
            if (extracted?.amount && extracted?.currency) {
              text = `:32A:241125${String(extracted.currency).toUpperCase()}${String(extracted.amount)}\n:20:${extracted.reference || "AUTO-GEMINI"}`
            }
          } catch {}
        }
      } catch {}
    }

    // Note: Gemini Vision handled above via direct HTTP; no dynamic client import here

    if (!text) {
      // Ne renvoie plus 400 pour ne pas bloquer l'UI ;
      // renvoie un résultat invalide, l'UI proposera la saisie manuelle.
      console.error("[SWIFT PARSE] Aucun texte extrait du document", {
        fileName,
        mimeType,
        hasFileBase64: !!fileBase64,
        hasOCRSpaceKey: !!process.env.OCR_SPACE_KEY,
        hasGeminiKey: !!geminiApiKey,
      })
      return NextResponse.json({ 
        data: null, 
        valid: false, 
        errors: [
          "Impossible d'extraire le texte du document SWIFT. " +
          "Vérifiez que le fichier est un PDF/image lisible ou utilisez la saisie manuelle."
        ],
        rawContent: "",
      })
    }

    console.log(`[SWIFT PARSE] Texte extrait: ${text.length} caractères`)
    const result = parseSWIFT(text)
    
    // Log des erreurs de parsing pour debugging
    if (!result.valid && result.errors.length > 0) {
      console.warn(`[SWIFT PARSE] Erreurs de validation (${result.errors.length}):`, result.errors.slice(0, 5))
    }

    // Analyse KYC/AML optionnelle (aide backoffice), ne change pas l’existant
    try {
      const analyzeFlag = String((body?.analyze ?? "")).toLowerCase()
      const doAnalyze = analyzeFlag === "true" || analyzeFlag === "1"
      if (doAnalyze && geminiApiKey) {
        const model = process.env.GEMINI_MODEL || "gemini-1.5-flash"
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`
        const prompt = `Agent KYC/AML/LCB-FT expert fintech marocain (conforme BAM 7/W/16, OC IGOC 2024, CNDP 09-08, RGPD, ACPR, Tracfin, Dahir 1-21-77 loi 103-12/51-20, feuille Fintech BAM, loi finances 2025, AMMC). Analyse doc extrait pour aider backoffice (pas valider auto, décision manuelle équipe).\n\nTexte: ${text}\n\n1. Type doc (tous PDF: SWIFT MT103/202, CNI, RC, ICE, Patente, ID dirigeant, UBO, justificatif activité/douaniers/factures, contrats, attestations, rapports audit, plans budgétaires, statuts, CNDP, journaux ops, procédures, manuels, appels d'offres, rapports, alertes, contrats banques, accords, certificats sécurité, planning, audits, tests intégration, preuves temps réel, politiques confidentialité, configs, lettres AWB/CIH, autre).\n2. Données JSON (présent seulement): {"type_doc":"","swift_fields":{"num_message":"","date_heure_envoi":"","bic_emetteur":"","bic_recepteur":"","montant_devise":"","montant_credite_devise":"","compte_emetteur":"","compte_beneficiaire":"","ref_transaction":"","motif_paiement":"","type_message":"","infos_conformite":"","statut_accuse":"","trace_conversion":""},"kyc_fields":{"nom":"","prenom":"","date_naissance":"YYYY-MM-DD","adresse":"","numero_piece":"","date_expiration":"YYYY-MM-DD","mrZ_code":"","iban":"","bic":"","ice":"","rc":"","patente":"","ubo":[],"justificatifs_douaniers":"","factures":""},"transaction_fields":{"montant_transaction":"","beneficiaire":"","date_transaction":"YYYY-MM-DD","quotite_70_30":{"rapatrie_70":true,"libre_30":true}} }\n3. Vérifs (true/false + expl): {"valide_expiration":true/false,"mrZ_cohérent":true/false,"donnees_cohérentes":true/false,"photo_suspecte":true/false,"delai_rapatriement_ok":true/false,"quotite_conforme":true/false,"iban_vop_valide":true/false,"lcb_ft_ok":true/false}\n4. Alertes array (si risque): ["pep_sanctions: oui/non + source","risque_transaction: ...","anomalies_quotite: ...","delai_violation: ...","incoherences_vop_iban: ...","risques_loi_finances_2025: ...","autre: ..."]\n5. Score 0-100: 40% qualité extract +30% légitimité +30% risques.\n6. Suggestion aide backoffice: "SUGG APPROUVE" (>80 vert), "SUGG REVISION MANUELLE" (50-80 jaune), "SUGG REFUSE" (<50 rouge) + raison (aide seulement, décision équipe).\n\nJSON uniquement.`
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        })
        const data = await resp.json()
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
        const parsed = tryParseJson(raw)
        if (parsed) {
          ;(result as any).analysis = parsed
        } else if (raw) {
          ;(result as any).analysis = { raw }
        }
      }
    } catch {}

    if (result.data) {
      const amt = parseFloat(result.data.amount || "0")
      const allowed30 = Math.round(amt * 0.3)
      const reserve70 = Math.round(amt * 0.7)
      ;(result as any).data.igoc = { allowed30, reserve70 }
    }

    // Include raw text content for storage and OCR analysis
    ;(result as any).rawContent = text || ""
    ;(result as any).content = text || ""

    if (userId) {
      audit.log(
        userId,
        "pme",
        "TRANSACTION_INITIATED" as any,
        "swift_message",
        result.data?.reference || "unknown",
        {
          valid: result.valid,
          errorCount: result.errors.length,
        }
      )
    }

    ;(result as any).meta = { provider, promptVersion: PROMPT_VERSION }
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to parse SWIFT" }, { status: 500 })
  }
}
