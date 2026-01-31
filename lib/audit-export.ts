import { audit } from "./audit-logger"

export class AuditExporter {
  /**
   * Export audit logs for compliance
   */
  static exportAuditLogs(
    startDate?: string,
    endDate?: string,
    format: "json" | "csv" = "csv"
  ): string {
    const logs = audit.getLogs({ startDate, endDate })

    if (format === "json") {
      return JSON.stringify(logs, null, 2)
    }

    // CSV format with detailed columns
    const headers = [
      "ID",
      "Timestamp",
      "User ID",
      "Role",
      "Action",
      "Entity",
      "Entity ID",
      "Status",
      "IP Address",
      "User Agent",
      "Error Message",
      "Details",
    ]

    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      log.userId,
      log.userRole,
      log.action,
      log.entity,
      log.entityId,
      log.status,
      log.ipAddress || "",
      log.userAgent || "",
      log.errorMessage || "",
      JSON.stringify(log.details || {}),
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    return csv
  }

  /**
   * Generate audit summary for period
   */
  static generateAuditSummary(startDate?: string, endDate?: string): Record<string, any> {
    const summary = audit.getSummary(startDate, endDate)

    return {
      period: {
        startDate: startDate || "All",
        endDate: endDate || "All",
      },
      statistics: summary,
      exportedAt: new Date().toISOString(),
    }
  }

  /**
   * Download audit file
   */
  static downloadAuditFile(
    content: string,
    filename: string,
    format: "json" | "csv"
  ): void {
    const mimeType = format === "json" ? "application/json" : "text/csv"
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

export const auditExporter = new AuditExporter()
