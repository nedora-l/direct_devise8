"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { audit } from "@/lib/audit-logger"
import { auditExporter } from "@/lib/audit-export"
import { Download } from 'lucide-react'

export default function AuditViewer() {
  const [logs, setLogs] = useState<any[]>([])
  const [filter, setFilter] = useState("")
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    const allLogs = audit.getLogs()
    setLogs(allLogs)
  }, [])

  const filteredLogs = logs.filter((log) =>
    filter === "" || log.action.includes(filter.toUpperCase()) || log.entity.includes(filter)
  )

  const handleExport = () => {
    const content = auditExporter.exportAuditLogs(startDate || undefined, endDate || undefined, exportFormat)
    auditExporter.downloadAuditFile(
      content,
      `audit-logs-${new Date().toISOString().split("T")[0]}.${exportFormat}`,
      exportFormat
    )
  }

  const getStatusBadge = (status: string) => {
    return status === "success" ? (
      <Badge className="bg-green-100 text-green-900">Succès</Badge>
    ) : (
      <Badge variant="destructive">Erreur</Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal d'Audit (LCB/FT)</CardTitle>
        <CardDescription>
          Consultez et exportez tous les logs d'audit pour la conformité réglementaire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Filtrer par action</Label>
            <Input
              placeholder="Ex: LOGIN, TRANSACTION"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date de début</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Date de fin</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Format export</Label>
            <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleExport} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Exporter les logs ({filteredLogs.length})
        </Button>

        <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Timestamp</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Entité</th>
                <th className="px-4 py-2 text-left">Utilisateur</th>
                <th className="px-4 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.slice(0, 50).map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{log.action}</td>
                  <td className="px-4 py-2 text-xs">{log.entity}</td>
                  <td className="px-4 py-2 text-xs">{log.userId}</td>
                  <td className="px-4 py-2">{getStatusBadge(log.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Affichant {Math.min(filteredLogs.length, 50)} sur {filteredLogs.length} logs
        </p>
      </CardContent>
    </Card>
  )
}
