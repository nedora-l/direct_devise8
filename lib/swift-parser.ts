import type { SWIFTData } from "./types"

export class SWIFTParser {
  /**
   * Parse SWIFT MT103/MT202 message
   */
  static parse(content: string): SWIFTData {
    const raw = typeof content === "string" ? content : String(content)
    const normalized = raw
      .toUpperCase()
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .replace(/[()]/g, "")

    const ibanRegex = /[A-Z]{2}\d{2}[A-Z0-9]{11,30}/
    const bicRegex = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/

    const reference = this.extractField(normalized, ":20:")
    const date = this.extractField(normalized, ":32A:")
    const amount = this.extractField(normalized, ":32A:", 1)
    const currency = this.extractField(normalized, ":32A:", 2)

    let senderBic = this.extractField(normalized, ":50A:", 0) || this.extractField(normalized, ":50K:")
    const senderName = this.extractField(normalized, ":50F:", 1) || this.extractField(normalized, ":50K:", 1)
    let senderIban = this.extractField(normalized, ":50A:") || ""
    if (!senderIban) {
      const raw50 = this.extractField(normalized, ":50K:")
      const foundIban50 = raw50.replace(/\s+/g, "").match(ibanRegex)?.[0]
      if (foundIban50) senderIban = foundIban50
    }
    if (!senderBic) {
      const raw50 = this.extractField(normalized, ":50A:") || this.extractField(normalized, ":50K:") || ""
      const inlineBic = raw50.replace(/\s+/g, "").match(/[A-Z0-9]{8}(?:[A-Z0-9]{3})?/)
      if (inlineBic) senderBic = inlineBic[0]
    }

    const raw59 = this.extractField(normalized, ":59:")
    const raw59A = this.extractField(normalized, ":59A:")

    // Beneficiary BIC: prefer a valid BIC in :59A:, otherwise look in :59:
    let beneficiaryBic = ""
    const inlineBic59A = raw59A.replace(/\s+/g, "").match(/[A-Z0-9]{8}(?:[A-Z0-9]{3})?/)
    const inlineBic59 = raw59.replace(/\s+/g, "").match(/[A-Z0-9]{8}(?:[A-Z0-9]{3})?/)
    if (inlineBic59A) beneficiaryBic = inlineBic59A[0]
    else if (inlineBic59) beneficiaryBic = inlineBic59[0]

    // Beneficiary Name: prefer :59F: or fallback to :59:
    const beneficiaryName = this.extractField(normalized, ":59F:", 1) || raw59

    // Beneficiary IBAN: try to find IBAN in :59A: or :59:
    let beneficiaryIban = ""
    const foundIban59A = raw59A.replace(/\s+/g, "").match(ibanRegex)?.[0]
    const foundIban59 = raw59.replace(/\s+/g, "").match(ibanRegex)?.[0]
    if (foundIban59A) beneficiaryIban = foundIban59A
    else if (foundIban59) beneficiaryIban = foundIban59

    const chargesCode = this.extractField(normalized, ":71A:") || "OUR"
    const raw33B = this.extractField(normalized, ":33B:")
    let instructedAmount = ""
    let instructedCurrency = ""
    if (raw33B) {
      const m33 = raw33B.match(/([A-Z]{3})\s*([\d\.,]+)/)
      if (m33) {
        instructedCurrency = (m33[1] || "").toUpperCase()
        const s = String(m33[2] || "").replace(/\s/g, "")
        const hasComma = s.includes(',')
        const hasDot = s.includes('.')
        instructedAmount = (() => {
          if (hasComma && hasDot) {
            const lc = s.lastIndexOf(',')
            const ld = s.lastIndexOf('.')
            return lc > ld ? s.replace(/\./g, '').replace(/,/g, '.') : s.replace(/,/g, '')
          }
          if (hasComma && !hasDot) return s.replace(/,/g, '.')
          return s
        })()
      } else {
        instructedAmount = raw33B
      }
    }
    const transactionType = normalized.includes(":50A:") ? "MT103" : "MT202"

    return {
      reference,
      date,
      amount,
      currency,
      senderBic,
      senderName,
      senderIban,
      beneficiaryBic,
      beneficiaryName,
      beneficiaryIban,
      chargesCode,
      instructedAmount,
      instructedCurrency,
      transactionType,
      rawContent: raw,
    }
  }

  /**
   * Validate SWIFT data
   */
  static validate(data: SWIFTData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.reference?.trim()) errors.push("Reference field :20: is missing")
    if (!data.date?.trim()) errors.push("Date field :32A: is missing")
    if (!data.amount?.trim()) errors.push("Amount in :32A: is missing")
    if (!data.currency?.match(/^[A-Z]{3}$/)) errors.push("Currency must be 3-letter ISO code")
    // Beneficiary must have at least one identifier: IBAN or BIC
    if (!data.beneficiaryIban?.trim() && !data.beneficiaryBic?.trim()) {
      errors.push("Beneficiary identifier is missing (IBAN or BIC)")
    }
    if (!data.chargesCode?.match(/^(OUR|BEN|SHA)$/))
      errors.push("Charges code must be OUR, BEN, or SHA")

    const amount = parseFloat(data.amount || "0")
    if (isNaN(amount) || amount <= 0) errors.push("Amount must be a positive number")

    const bicRegex = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/
    // Sender BIC optional: if present, must be valid
    if (data.senderBic && !data.senderBic.match(bicRegex)) errors.push("Sender BIC invalid")
    if (data.beneficiaryBic && !data.beneficiaryBic.match(bicRegex)) {
      errors.push("Beneficiary BIC invalid")
    }

    const dateRegex = /^\d{6}$/
    if (!data.date?.match(dateRegex)) errors.push("Date format YYMMDD required in :32A:")

    const refRegex = /^[A-Z0-9\-_/]+$/
    if (!data.reference?.match(refRegex)) errors.push("Reference contains invalid characters")

    const allowedCurrencies = new Set(["EUR", "USD", "GBP", "CHF", "MAD"])
    if (!allowedCurrencies.has((data.currency || "").toUpperCase())) errors.push("Currency not allowed")

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Extract field from SWIFT content
   */
  private static extractField(content: string, fieldTag: string, partIndex: number = 0): string {
    const cleaned = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    // Build a tolerant tag pattern allowing optional spaces between characters, e.g. : 3 2 A :
    const core = fieldTag.replace(/^:/, "").replace(/:$/, "")
    const tagPattern = `:\\s*${core.split("").join("\\s*")}\\s*:`
    // Tolerant lookahead: next tag at newline with optional spaces, or brace blocks, or end
    const nextTagPattern = `\n:\\s*[0-9]{2,3}\\s*[A-Z]\\s*:`
    const regex = new RegExp(`${tagPattern}([\\s\\S]*?)(?=${nextTagPattern}|$|\{|\n\{)`, "i")
    const match = cleaned.match(regex)

    if (!match) return ""

    const value = match[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim()
    if (fieldTag === ":32A:") {
      // Expected format: YYMMDD + CURRENCY(3) + AMOUNT (OCR tolerant)
      const m = value.match(/(\d{6})([A-Z]{3})([\d\.,]+)/i)
      const datePart = m?.[1] || ""
      const currencyPart = m?.[2] || ""
      const rawAmt = (m?.[3] || "").replace(/\s/g, "")
      const hasComma = rawAmt.includes(',')
      const hasDot = rawAmt.includes('.')
      const amountPart = (() => {
        if (hasComma && hasDot) {
          const lc = rawAmt.lastIndexOf(',')
          const ld = rawAmt.lastIndexOf('.')
          return lc > ld ? rawAmt.replace(/\./g, '').replace(/,/g, '.') : rawAmt.replace(/,/g, '')
        }
        if (hasComma && !hasDot) return rawAmt.replace(/,/g, '.')
        return rawAmt
      })()

      if (partIndex === 1) return amountPart
      if (partIndex === 2) return currencyPart
      return datePart
    }

    return value
  }

  /**
   * Extract all fields as key-value pairs
   */
  static extractAllFields(content: string): Record<string, string> {
    const fields: Record<string, string> = {}
    const fieldRegex = /:([\d]{2,3}[A-Z])([^:]*?)(?=:[0-9]{2,3}[A-Z]:|$)/g
    let match

    while ((match = fieldRegex.exec(content)) !== null) {
      fields[match[1]] = match[2].trim()
    }

    return fields
  }
}

/**
 * Convenience function to parse and validate SWIFT content
 */
export function parseSWIFT(content: string): { data: SWIFTData | null; valid: boolean; errors: string[] } {
  try {
    const data = SWIFTParser.parse(content)
    const validation = SWIFTParser.validate(data)
    return {
      // Toujours renvoyer les données extraites, même si la validation échoue
      data: data,
      valid: validation.valid,
      errors: validation.errors,
    }
  } catch (error) {
    return {
      data: null,
      valid: false,
      errors: [`Failed to parse SWIFT: ${error instanceof Error ? error.message : "Unknown error"}`],
    }
  }
}
