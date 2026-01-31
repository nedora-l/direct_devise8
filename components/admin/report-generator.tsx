"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download } from 'lucide-react'
import { reportGenerator } from "@/lib/report-generator"
import { audit } from "@/lib/audit-logger"

export default function ReportGenerator() {
  const [reportType, setReportType] = useState("")
  const [period, setPeriod] = useState("month")
  const [format, setFormat] = useState("pdf")
  const [loading, setLoading] = useState(false)

  const reportTypes = [
    { id: "activity", name: "Rapport d'Activité", desc: "Résumé mensuel des opérations" },
    { id: "compliance", name: "Audit Conformité", desc: "Vérification IGOC et BAM" },
    { id: "financial", name: "Rapport Financier", desc: "Volumes, commissions, gains" },
    { id: "risk", name: "Analyse Risques", desc: "Anomalies et alertes détectées" },
    { id: "oc", name: "Rapport Office des Changes", desc: "Soumission OC avec pièces jointes" },
  ]

  const handleGenerate = async () => {
    if (!reportType || !period) return
    
    setLoading(true)
    try {
      let report
      switch (reportType) {
        case "compliance":
          report = reportGenerator.generateComplianceReport(period, "admin")
          break
        case "oc":
          report = reportGenerator.generateIGOCReport(period, "admin")
          break
        default:
          report = reportGenerator.generateComplianceReport(period, "admin")
      }

      const content = format === "html" ? reportGenerator.exportToHTML(report) : reportGenerator.exportToCSV(report)
      reportGenerator.downloadFile(content, `rapport-${reportType}-${period}.${format === "html" ? "html" : "csv"}`, format as "html" | "csv")
      
      audit("admin", "admin", "REPORT_GENERATED", "report", report.id, { type: reportType, period, format })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Générateur de Rapports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type de Rapport</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={!reportType || loading}>
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Génération..." : "Générer et télécharger"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Rapports Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: "Activité - Janvier 2025", date: "15/01/2025", format: "PDF", size: "2.4 MB" },
              { name: "Conformité - Q4 2024", date: "01/01/2025", format: "PDF", size: "3.1 MB" },
              { name: "Financier - Décembre 2024", date: "28/12/2024", format: "Excel", size: "512 KB" },
            ].map((report) => (
              <div key={report.name} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-sm">{report.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.date} • {report.format} • {report.size}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Télécharger
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
