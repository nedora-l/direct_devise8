"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TransactionHistory() {
  const [period, setPeriod] = useState("month")
  const [searchRef, setSearchRef] = useState("")

  const mockTransactions = [
    {
      id: "TRX-001",
      date: "2025-01-15",
      amount: "5000",
      currency: "EUR",
      rate: "11.25",
      converted: "56250",
      status: "validé",
      gains: "120",
    },
    {
      id: "TRX-002",
      date: "2025-01-10",
      amount: "8500",
      currency: "EUR",
      rate: "11.30",
      converted: "96050",
      status: "validé",
      gains: "280",
    },
    {
      id: "TRX-003",
      date: "2025-01-05",
      amount: "3200",
      currency: "USD",
      rate: "10.20",
      converted: "32640",
      status: "en attente",
      gains: "0",
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Rechercher</Label>
          <Input
            placeholder="Référence transaction..."
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Label className="text-xs text-muted-foreground">Période</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">Ref.</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Montant</th>
              <th className="px-4 py-3 text-left font-medium">Taux</th>
              <th className="px-4 py-3 text-left font-medium">Converti</th>
              <th className="px-4 py-3 text-left font-medium">Gains</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {mockTransactions.map((tx) => (
              <tr key={tx.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-mono text-xs">{tx.id}</td>
                <td className="px-4 py-3">{tx.date}</td>
                <td className="px-4 py-3">
                  {tx.currency} {tx.amount}
                </td>
                <td className="px-4 py-3 font-mono">{tx.rate}</td>
                <td className="px-4 py-3 font-bold">MAD {tx.converted}</td>
                <td className="px-4 py-3 text-green-600 font-medium">{tx.gains}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      tx.status === "validé" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm">
                    Détails
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Affichage 1-3 de 12 transactions</p>
        <Button variant="outline">Exporter CSV</Button>
      </div>
    </div>
  )
}
