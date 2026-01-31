import type { Transaction, ReverseAuction, ConformityCheck } from "./types"

export class ConformityChecker {
  /**
   * Check IGOC compliance (Office des Changes regulations)
   */
  static checkIGOC(transaction: Transaction): ConformityCheck {
    const checks = {
      amountLimit: transaction.amount <= 1000000, // 1M MAD max without special authorization
      currencyAllowed: ["EUR", "USD", "GBP", "CHF"].includes(transaction.exchangeCurrency),
      rateWithinBand: transaction.rate > 0.8 && transaction.rate < 1.5, // Realistic band
      documentationRequired: transaction.amount > 5000,
    }

    const passed = Object.values(checks).every((v) => v === true)

    return {
      id: `CHECK-IGOC-${Date.now()}`,
      checkType: "igoc",
      status: passed ? "passed" : "failed",
      checkDate: new Date().toISOString(),
      details: checks,
    }
  }

  /**
   * Check 70/30 rule for import/export operations
   * A company cannot have more than 70% of operations in one direction
   */
  static check70_30(
    companyId: string,
    totalOperations: number,
    exportOperations: number
  ): ConformityCheck {
    const exportPercentage = (exportOperations / totalOperations) * 100
    const importPercentage = 100 - exportPercentage

    const passed = exportPercentage <= 70 && importPercentage <= 70

    return {
      id: `CHECK-70-30-${Date.now()}`,
      checkType: "70_30",
      status: passed ? "passed" : exportPercentage > 70 ? "warning" : "warning",
      checkDate: new Date().toISOString(),
      details: {
        exportPercentage: Math.round(exportPercentage),
        importPercentage: Math.round(importPercentage),
        threshold: 70,
      },
    }
  }

  /**
   * Check KYC status
   */
  static checkKYC(kycStatus: string): ConformityCheck {
    const passed = kycStatus === "approved"

    return {
      id: `CHECK-KYC-${Date.now()}`,
      checkType: "kyc",
      status: passed ? "passed" : "failed",
      checkDate: new Date().toISOString(),
      details: {
        status: kycStatus,
        required: true,
      },
    }
  }

  /**
   * Check AML risk assessment
   */
  static checkAML(amlRiskScore: number): ConformityCheck {
    let status: "passed" | "warning" | "failed" = "passed"
    if (amlRiskScore > 50 && amlRiskScore <= 70) status = "warning"
    if (amlRiskScore > 70) status = "failed"

    return {
      id: `CHECK-AML-${Date.now()}`,
      checkType: "aml",
      status,
      checkDate: new Date().toISOString(),
      details: {
        riskScore: amlRiskScore,
        redFlag: amlRiskScore > 50,
      },
    }
  }

  /**
   * Check SWIFT compliance
   */
  static checkSWIFT(swiftReference: string, isValid: boolean): ConformityCheck {
    const passed = isValid && !!swiftReference

    return {
      id: `CHECK-SWIFT-${Date.now()}`,
      checkType: "swift",
      status: passed ? "passed" : "failed",
      checkDate: new Date().toISOString(),
      details: {
        reference: swiftReference,
        valid: isValid,
      },
    }
  }

  static assessSwift(data: {
    amount?: number
    currency?: string
    chargesCode?: string
    manualEntry?: boolean
    reference?: string
  }) {
    const flags: string[] = []
    let score = 100
    const amount = typeof data.amount === "number" ? data.amount : 0
    const currency = (data.currency || "").toUpperCase()
    const charges = (data.chargesCode || "OUR").toUpperCase()
    const manual = !!data.manualEntry
    if (manual) {
      flags.push("Saisie manuelle")
      score -= 20
    }
    if (!data.reference) {
      flags.push("Référence manquante")
      score -= 20
    }
    const allowed = ["EUR", "USD", "GBP", "CHF", "MAD"]
    if (!allowed.includes(currency)) {
      flags.push("Devise non autorisée")
      score -= 25
    }
    if (!isFinite(amount) || amount <= 0) {
      flags.push("Montant invalide")
      score -= 30
    } else if (amount > 500000) {
      flags.push("Montant élevé")
      score -= 15
    }
    if (!/^(OUR|BEN|SHA)$/.test(charges)) {
      flags.push("Code frais invalide")
      score -= 10
    } else if (charges !== "OUR") {
      flags.push("Frais non OUR")
      score -= 10
    }
    if (score < 0) score = 0
    let level: "low" | "medium" | "high" = "low"
    if (score < 70) level = "medium"
    if (score < 40) level = "high"
    return { riskScore: score, riskLevel: level, flags }
  }

  /**
   * Check document requirements
   */
  static checkDocuments(documentCount: number, requiredCount: number = 3): ConformityCheck {
    const passed = documentCount >= requiredCount

    return {
      id: `CHECK-DOCS-${Date.now()}`,
      checkType: "documents",
      status: passed ? "passed" : "failed",
      checkDate: new Date().toISOString(),
      details: {
        documented: documentCount,
        required: requiredCount,
      },
    }
  }

  /**
   * Calculate overall conformity score (0-100)
   */
  static calculateScore(checks: ConformityCheck[]): number {
    if (checks.length === 0) return 0

    const weights = {
      igoc: 0.3,
      "70_30": 0.2,
      kyc: 0.25,
      aml: 0.15,
      swift: 0.05,
      documents: 0.05,
    }

    let score = 0
    for (const check of checks) {
      const weight = weights[check.checkType as keyof typeof weights] || 0.1
      const checkScore = check.status === "passed" ? 100 : check.status === "warning" ? 50 : 0
      score += checkScore * weight
    }

    return Math.round(score)
  }
}

/**
 * Run all conformity checks
 */
export function runConformityChecks(params: {
  transaction?: Transaction
  companyId?: string
  totalOps?: number
  exportOps?: number
  kycStatus?: string
  amlScore?: number
  swiftRef?: string
  swiftValid?: boolean
  docCount?: number
}): ConformityCheck[] {
  const checks: ConformityCheck[] = []

  if (params.transaction) {
    checks.push(ConformityChecker.checkIGOC(params.transaction))
  }

  if (params.companyId && params.totalOps) {
    checks.push(ConformityChecker.check70_30(params.companyId, params.totalOps, params.exportOps || 0))
  }

  if (params.kycStatus) {
    checks.push(ConformityChecker.checkKYC(params.kycStatus))
  }

  if (params.amlScore !== undefined) {
    checks.push(ConformityChecker.checkAML(params.amlScore))
  }

  if (params.swiftRef !== undefined) {
    checks.push(ConformityChecker.checkSWIFT(params.swiftRef, params.swiftValid ?? false))
  }

  if (params.docCount !== undefined) {
    checks.push(ConformityChecker.checkDocuments(params.docCount))
  }

  return checks
}
