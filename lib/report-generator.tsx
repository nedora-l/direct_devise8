import type { ComplianceReport, Transaction, ReverseAuction } from "./types"
import { audit } from "./audit-logger"
import { auctionManager } from "./auction-manager"

export class ReportGenerator {
  /**
   * Generate compliance report
   */
  static generateComplianceReport(
    period: string,
    generatedBy: string,
    operations: Transaction[] = []
  ): ComplianceReport {
    const report: ComplianceReport = {
      id: `REPORT-${Date.now()}`,
      period,
      generatedAt: new Date().toISOString(),
      generatedBy,
      reportType: "summary",
      totalOperations: operations.length,
      conformingOperations: operations.filter((op) => op.conformityScore >= 75).length,
      conformityRate: operations.length > 0
        ? Math.round((operations.filter((op) => op.conformityScore >= 75).length / operations.length) * 100)
        : 0,
      flaggedOperations: operations.filter((op) => op.conformityScore < 75).length,
      alerts: [],
      recommendations: [],
    }

    // Generate recommendations
    if (report.conformityRate < 80) {
      report.recommendations.push("Améliorer le processus KYC")
      report.recommendations.push("Renforcer les vérifications AML")
    }

    if (report.flaggedOperations > 0) {
      report.recommendations.push("Enquête requise sur les opérations signalées")
    }

    report.recommendations.push("Audit régulier des fournisseurs tiers")

    return report
  }

  /**
   * Generate IGOC compliance report
   */
  static generateIGOCReport(period: string, generatedBy: string): ComplianceReport {
    return {
      id: `REPORT-IGOC-${Date.now()}`,
      period,
      generatedAt: new Date().toISOString(),
      generatedBy,
      reportType: "igoc",
      totalOperations: 0,
      conformingOperations: 0,
      conformityRate: 0,
      flaggedOperations: 0,
      alerts: [],
      recommendations: [
        "Respecter les limites d'amount",
        "Vérifier les partenaires étrangers",
        "Documenter toutes les justifications",
        "Signaler les opérations suspectes à l'Office des Changes",
      ],
    }
  }

  /**
   * Generate LCB/FT (Anti-Money Laundering) report
   */
  static generateLCBFTReport(period: string, generatedBy: string): ComplianceReport {
    return {
      id: `REPORT-LCBFT-${Date.now()}`,
      period,
      generatedAt: new Date().toISOString(),
      generatedBy,
      reportType: "lcb_ft",
      totalOperations: 0,
      conformingOperations: 0,
      conformityRate: 0,
      flaggedOperations: 0,
      alerts: [],
      recommendations: [
        "Effectuer la vérification KYC complète",
        "Analyser les patterns de transactions",
        "Surveiller les beneficiaires finaux",
        "Documenter les sources de fonds",
        "Déclarer les opérations suspectes à l'UGFF",
      ],
    }
  }

  /**
   * Generate KYC batch report
   */
  static generateKYCReport(period: string, generatedBy: string): ComplianceReport {
    return {
      id: `REPORT-KYCB-${Date.now()}`,
      period,
      generatedAt: new Date().toISOString(),
      generatedBy,
      reportType: "kycb",
      totalOperations: 0,
      conformingOperations: 0,
      conformityRate: 0,
      flaggedOperations: 0,
      alerts: [],
      recommendations: [
        "Valider tous les documents requis",
        "Vérifier les CIN et RC des UBOs",
        "Signaler les documents expirés",
        "Réchercher les PEP (Personnalités Politiquement Exposées)",
      ],
    }
  }

  /**
   * Export report to HTML
   */
  static exportToHTML(report: ComplianceReport): string {
    const date = new Date(report.generatedAt).toLocaleDateString("fr-FR")
    const time = new Date(report.generatedAt).toLocaleTimeString("fr-FR")

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport ${report.reportType.toUpperCase()}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { border-bottom: 3px solid #0066cc; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #0066cc; }
    .header p { margin: 5px 0; color: #666; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
    .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9; }
    .metric-card .value { font-size: 24px; font-weight: bold; color: #0066cc; }
    .metric-card .label { color: #666; font-size: 12px; }
    .section { margin: 30px 0; }
    .section h2 { color: #0066cc; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .recommendations { background: #f0f7ff; border-left: 4px solid #0066cc; padding: 15px; margin: 15px 0; }
    .recommendations ul { margin: 10px 0; padding-left: 20px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport de Conformité - ${report.reportType.toUpperCase()}</h1>
    <p>Période: ${report.period}</p>
    <p>Généré le: ${date} à ${time}</p>
    <p>Par: ${report.generatedBy}</p>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <div class="label">Total Opérations</div>
      <div class="value">${report.totalOperations}</div>
    </div>
    <div class="metric-card">
      <div class="label">Opérations Conformes</div>
      <div class="value">${report.conformingOperations}</div>
    </div>
    <div class="metric-card">
      <div class="label">Taux de Conformité</div>
      <div class="value">${report.conformityRate}%</div>
    </div>
    <div class="metric-card">
      <div class="label">Opérations Signalées</div>
      <div class="value">${report.flaggedOperations}</div>
    </div>
  </div>

  ${
    report.recommendations.length > 0
      ? `
  <div class="section">
    <h2>Recommandations</h2>
    <div class="recommendations">
      <ul>
        ${report.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
      </ul>
    </div>
  </div>
  `
      : ""
  }

  <div class="footer">
    <p>Ce rapport est confidentiel. Utilisé uniquement à des fins de conformité réglementaire.</p>
  </div>
</body>
</html>
    `
  }

  /**
   * Export report to CSV
   */
  static exportToCSV(report: ComplianceReport): string {
    return `Rapport de Conformité
Type: ${report.reportType}
Période: ${report.period}
Généré le: ${report.generatedAt}
Généré par: ${report.generatedBy}

Métriques
Total Opérations,${report.totalOperations}
Opérations Conformes,${report.conformingOperations}
Taux de Conformité (%),${report.conformityRate}
Opérations Signalées,${report.flaggedOperations}

Recommandations
${report.recommendations.map((r, i) => `${i + 1},${r}`).join("\n")}
    `
  }

  /**
   * Download file
   */
  static downloadFile(content: string, filename: string, format: "html" | "csv"): void {
    const mimeType = format === "html" ? "text/html" : "text/csv"
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export const reportGenerator = new ReportGenerator()
