"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function ExecutionTracker() {
  const executions = [
    {
      id: "EX-001",
      trx: "TRX-001",
      client: "Import/Export SA",
      status: "exécuté",
      swift: "SWIFT-TRX-001",
      time: "10:45",
    },
    {
      id: "EX-002",
      trx: "TRX-002",
      client: "Tech Solutions",
      status: "en cours",
      swift: "SWIFT-TRX-002",
      time: "11:30",
    },
    {
      id: "EX-003",
      trx: "TRX-003",
      client: "Services Consulting",
      status: "attente",
      swift: "-",
      time: "-",
    },
  ]

  const volumeData = [
    { hour: "09:00", volume: 15000 },
    { hour: "10:00", volume: 28500 },
    { hour: "11:00", volume: 42000 },
    { hour: "12:00", volume: 35800 },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Exécutions du Jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Exécution</th>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-left">Statut</th>
                  <th className="px-4 py-2 text-left">SWIFT</th>
                  <th className="px-4 py-2 text-left">Heure</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex) => (
                  <tr key={ex.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-2 font-mono text-xs">{ex.trx}</td>
                    <td className="px-4 py-2">{ex.client}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={
                          ex.status === "exécuté" ? "default" : ex.status === "en cours" ? "secondary" : "outline"
                        }
                      >
                        {ex.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{ex.swift}</td>
                    <td className="px-4 py-2">{ex.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Volume Traité (Jour)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: `1px solid var(--color-border)`,
                  color: "var(--color-foreground)",
                }}
              />
              <Bar dataKey="volume" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
