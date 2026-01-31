import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PMENav from "@/components/pme/pme-nav";
import SwiftUpload from "@/components/pme/swift-upload";
import TransactionHistory from "@/components/pme/transaction-history";
import ExchangeRateChart from "@/components/pme/exchange-rate-chart";
import RecentSwifts from "@/components/pme/recent-swifts";
import ActiveAuctionsList from "@/components/pme/active-auctions-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AnimatedBackground } from "@/components/animated-background";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

export default async function PMEDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || (session as any).user?.role !== "pme") redirect("/pme/login");
  const prisma = getPrisma();
  const user = (session as any).user;
  const userRow = await prisma.user.findUnique({
    where: { id: user.id },
    include: { company: true },
  });
  if (!userRow || !userRow.company) redirect("/pme/login");
  const company = userRow.company;
  const kyc = await prisma.kycProfile.findUnique({
    where: { companyId: company.id },
  });

  // Check KYC status and redirect if not approved
  const kycStatus = kyc?.complianceStatus || "pending";
  if (kycStatus === "pending" || kycStatus === "reviewing") {
    redirect(`/register/pme/waiting?companyId=${company.id}`);
  }
  if (kycStatus === "rejected") {
    redirect("/pme/kyc-onboarding?rejected=true");
  }
  const swifts = await prisma.swift.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });
  const auctions = await prisma.auction.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });
  const txs = await prisma.transaction.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });
  const totalAmountEUR = swifts
    .filter((s) => s.currency === "EUR")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const quota70 = Math.round(
    ((totalAmountEUR * 0.7) / Math.max(totalAmountEUR, 1)) * 100
  );

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <PMENav
        user={{
          name: userRow.name,
          email: userRow.email,
          companyName: userRow.company.name,
          role: "pme",
        }}
      />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenue, {company.name}
          </h1>
          <p className="text-muted-foreground">
            Gérez vos opérations de change avec conformité Office des Changes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold text-primary">{txs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Montant (EUR)</p>
                <p className="text-2xl font-bold text-primary dark:text-primary">
                  €{fmt(totalAmountEUR)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Gains estimés</p>
                <p className="text-2xl font-bold text-green-600">
                  €{fmt(Math.round(totalAmountEUR * 0.03))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Quota 70%</p>
                <p className="text-2xl font-bold text-primary">{quota70}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RecentSwifts swifts={swifts.map(s => ({
            id: s.id,
            reference: s.reference,
            amount: Number(s.amount),
            currency: s.currency,
            validated: s.validated,
            validatedAt: s.validatedAt?.toISOString() || null,
            adminStatus: s.adminStatus,
            createdAt: s.createdAt.toISOString(),
            rateStrategy: s.rateStrategy || null,
            targetRate: s.targetRate || null,
            targetCurrency: s.targetCurrency || null,
            rateTriggeredAt: s.rateTriggeredAt?.toISOString() || null,
          }))} />
          <ActiveAuctionsList auctions={auctions.map(a => ({
            id: a.id,
            title: a.title,
            amount: Number(a.amount),
            sourceCurrency: a.sourceCurrency,
            targetCurrency: a.targetCurrency,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
            endsAt: a.endsAt.toISOString(),
            swiftReference: a.swiftReference,
          }))} />
        </div>

        <Tabs defaultValue="kyc" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="kyc">KYC Status</TabsTrigger>
            <TabsTrigger value="upload" disabled={(kyc?.complianceStatus || "pending") !== "approved"}>
              Nouvelle Demande
            </TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="rates">Analyse Taux</TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Statut Vérification KYC</CardTitle>
                <CardDescription>
                  Complétez votre vérification KYC pour déverrouiller toutes les
                  fonctionnalités
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-card">
                    <p className="text-sm text-muted-foreground mb-2">
                      Statut Actuel
                    </p>
                    <Badge
                      className={`${
                        (kyc?.complianceStatus || "pending") === "approved"
                          ? "bg-green-600 text-white dark:bg-green-500 dark:text-white"
                          : (kyc?.complianceStatus || "pending") === "rejected"
                          ? "bg-red-600 text-white dark:bg-red-500 dark:text-white"
                          : "bg-amber-600 text-white dark:bg-amber-500 dark:text-white"
                      }`}
                    >
                      {(kyc?.complianceStatus || "pending").toUpperCase()}
                    </Badge>
                  </div>
                  {(kyc?.complianceStatus || "pending") !== "approved" && (
                    <Button asChild className="w-full">
                      <Link href="/pme/kyc-onboarding">
                        {(kyc?.complianceStatus || "pending") === "pending"
                          ? "Démarrer KYC"
                          : "Continuer KYC"}
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            {(kyc?.complianceStatus || "pending") !== "approved" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Télécharger SWIFT</CardTitle>
                  <CardDescription>
                    Accès restreint - KYC requis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-amber-600 rounded-lg bg-amber-600/5">
                    <p className="text-sm text-foreground mb-4">
                      Vous devez compléter votre vérification KYC avant de pouvoir uploader un document SWIFT.
                    </p>
                    <Button asChild>
                      <Link href="/pme/kyc-onboarding">
                        Compléter mon KYC
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Télécharger SWIFT</CardTitle>
                  <CardDescription>
                    Uploadez votre fichier SWIFT pour initier une opération de
                    change. Montants {"<"} 10 000€ traités automatiquement.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SwiftUpload />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Transactions</CardTitle>
                <CardDescription>
                  Consultez toutes vos opérations de change et leurs statuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionHistory />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle>Analyse des Taux</CardTitle>
                <CardDescription>
                  Visualisez vos performances de taux sur différentes périodes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExchangeRateChart />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
