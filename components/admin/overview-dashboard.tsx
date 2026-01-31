"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function OverviewDashboard() {
  const volumeData = [
    { date: "05 Jan", volume: 45000, clients: 12 },
    { date: "10 Jan", volume: 78000, clients: 18 },
    { date: "15 Jan", volume: 95000, clients: 24 },
    { date: "20 Jan", volume: 102000, clients: 28 },
    { date: "25 Jan", volume: 125000, clients: 32 },
    { date: "01 Feb", volume: 145000, clients: 38 },
  ]

  const operationsByType = [
    { name: "Import/Export", value: 45, color: "var(--color-chart-1)" },
    { name: "Services", value: 35, color: "var(--color-chart-2)" },
    { name: "Investissement", value: 20, color: "var(--color-chart-3)" },
  ]

  const complianceStats = [
    { name: "Conforme", value: 156, status: "ok" },
    { name: "Alerté", value: 12, status: "warning" },
    { name: "Rejeté", value: 2, status: "error" },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Volume Total</p>
              <p className="text-2xl font-bold">€145K</p>
              <p className="text-xs text-green-600 mt-1">+12.5% vs. semaine</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">170</p>
              <p className="text-xs text-primary mt-1">Jour: 38 opérations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">PME Clients</p>
              <p className="text-2xl font-bold">38</p>
              <p className="text-xs text-accent mt-1">Actifs ce mois</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Banques Partner</p>
              <p className="text-2xl font-bold">6</p>
              <p className="text-xs text-muted-foreground mt-1">Connectées API</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Taux Moyen</p>
              <p className="text-2xl font-bold">11.28</p>
              <p className="text-xs text-green-600 mt-1">+0.05 vs. marché</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Évolution Volume & Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: `1px solid var(--color-border)`,
                    color: "var(--color-foreground)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  yAxisId="left"
                  name="Volume (EUR)"
                />
                <Line
                  type="monotone"
                  dataKey="clients"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  yAxisId="right"
                  name="Clients Actifs"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par Type d'Opération</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={operationsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {operationsByType.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Statut Conformité Globale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {complianceStats.map((stat) => (
              <div key={stat.name} className="p-4 bg-muted rounded-lg text-center">
                <Badge
                  className="mb-2"
                  variant={stat.status === "ok" ? "default" : stat.status === "warning" ? "secondary" : "destructive"}
                >
                  {stat.name}
                </Badge>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
