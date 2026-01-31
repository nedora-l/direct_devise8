import type { AuditLogEntry, AuditAction } from "./types"

class AuditLogger {
  private logs: AuditLogEntry[] = []
  private maxLogs = 10000

  /**
   * Log an audit event
   */
  log(
    userId: string,
    userRole: "pme" | "bank" | "admin",
    action: AuditAction,
    entity: string,
    entityId: string,
    changes: Record<string, any> = {},
    status: "success" | "failure" = "success",
    errorMessage?: string,
    details?: Record<string, any>
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      action,
      entity,
      entityId,
      changes,
      status,
      errorMessage,
      details,
      ipAddress: typeof window !== "undefined" ? undefined : "server",
      userAgent: typeof window !== "undefined" ? navigator.userAgent : "server",
    }

    this.logs.push(entry)

    // Maintain log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Persist to localStorage in client-side
    this.persistLog(entry)

    console.log("[v0-audit]", {
      action,
      entity,
      status,
      timestamp: entry.timestamp,
    })

    return entry
  }

  /**
   * Get all audit logs (filtered)
   */
  getLogs(filters?: {
    userId?: string
    action?: AuditAction
    entity?: string
    status?: "success" | "failure"
    startDate?: string
    endDate?: string
  }): AuditLogEntry[] {
    let filtered = [...this.logs]

    if (filters?.userId) {
      filtered = filtered.filter((l) => l.userId === filters.userId)
    }
    if (filters?.action) {
      filtered = filtered.filter((l) => l.action === filters.action)
    }
    if (filters?.entity) {
      filtered = filtered.filter((l) => l.entity === filters.entity)
    }
    if (filters?.status) {
      filtered = filtered.filter((l) => l.status === filters.status)
    }
    if (filters?.startDate) {
      filtered = filtered.filter((l) => l.timestamp >= filters.startDate!)
    }
    if (filters?.endDate) {
      filtered = filtered.filter((l) => l.timestamp <= filters.endDate!)
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * Export audit logs (for compliance reports)
   */
  export(format: "json" | "csv" = "json"): string {
    if (format === "json") {
      return JSON.stringify(this.logs, null, 2)
    }

    // CSV format
    const headers = [
      "ID",
      "Timestamp",
      "User ID",
      "Role",
      "Action",
      "Entity",
      "Entity ID",
      "Status",
      "Error Message",
    ]
    const rows = this.logs.map((log) => [
      log.id,
      log.timestamp,
      log.userId,
      log.userRole,
      log.action,
      log.entity,
      log.entityId,
      log.status,
      log.errorMessage || "",
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    return csv
  }

  /**
   * Get summary statistics
   */
  getSummary(startDate?: string, endDate?: string) {
    const filtered = this.getLogs({ startDate, endDate })
    return {
      total: filtered.length,
      successful: filtered.filter((l) => l.status === "success").length,
      failed: filtered.filter((l) => l.status === "failure").length,
      byAction: filtered.reduce(
        (acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
      byEntity: filtered.reduce(
        (acc, log) => {
          acc[log.entity] = (acc[log.entity] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }

  /**
   * Persist log to storage
   */
  private persistLog(entry: AuditLogEntry) {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("_audit_logs") || "[]"
        const logs = JSON.parse(stored)
        logs.push(entry)
        // Keep last 1000 logs in localStorage
        localStorage.setItem("_audit_logs", JSON.stringify(logs.slice(-1000)))
      } catch (e) {
        console.error("Failed to persist audit log:", e)
      }
    }
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = []
    if (typeof window !== "undefined") {
      localStorage.removeItem("_audit_logs")
    }
  }

  /**
   * Get persisted logs from localStorage
   */
  loadPersistedLogs() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("_audit_logs") || "[]"
        this.logs = JSON.parse(stored)
      } catch (e) {
        console.error("Failed to load persisted audit logs:", e)
      }
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger()
auditLogger.loadPersistedLogs()

// Export for convenience
export const audit = {
  log: auditLogger.log.bind(auditLogger),
  getLogs: auditLogger.getLogs.bind(auditLogger),
  export: auditLogger.export.bind(auditLogger),
  getSummary: auditLogger.getSummary.bind(auditLogger),
  clear: auditLogger.clear.bind(auditLogger),
}
