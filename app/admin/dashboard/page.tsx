import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AdminNav from "@/components/admin/admin-nav"
import OverviewDashboard from "@/components/admin/overview-dashboard"
import ConformityMonitor from "@/components/admin/conformity-monitor"
import ReportGenerator from "@/components/admin/report-generator"
import AlertsSystem from "@/components/admin/alerts-system"
import AuditViewer from "@/components/admin/audit-viewer"
import KYCVerificationPanel from "@/components/admin/kyc-verification-panel"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") redirect("/admin/login")
  const admin = (session as any).user

  return (
    <div className="min-h-screen bg-background">
      <AdminNav admin={admin} />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Tableau de Bord Administration</h1>
        <p className="text-muted-foreground mb-8">Pilotage en temps réel - Conformité OC et BAM</p>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="conformity">Conformité</TabsTrigger>
            <TabsTrigger value="alerts">Alertes</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewDashboard />
          </TabsContent>

          <TabsContent value="kyc">
            <KYCVerificationPanel />
          </TabsContent>

          <TabsContent value="conformity">
            <ConformityMonitor />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsSystem />
          </TabsContent>

          <TabsContent value="reports">
            <ReportGenerator />
          </TabsContent>

          <TabsContent value="audit">
            <AuditViewer />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
