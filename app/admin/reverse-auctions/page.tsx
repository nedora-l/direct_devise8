import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdminNav from "@/components/admin/admin-nav"
import ReverseAuctionsView from "@/components/admin/reverse-auctions-view"

export default async function ReverseAuctionsPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== "admin") redirect("/admin/login")
  const admin = (session as any).user as { id?: string }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav admin={admin} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Enchères Inversées</h1>
        <p className="text-muted-foreground mb-8">{`Gestion des appels d'offres pour les montants > 10,000€`}</p>

        <ReverseAuctionsView adminId={admin.id ?? ""} />
      </main>
    </div>
  )
}

