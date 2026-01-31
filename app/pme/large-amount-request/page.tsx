import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { redirect, revalidatePath } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PMENav from "@/components/pme/pme-nav"

async function submitRequestAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') return
  const prisma = getPrisma()
  const userId = (session as any).user.id as string
  const userRow = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
  if (!userRow || !userRow.company) return
  const amount = Number(formData.get('amount') || 0)
  if (isNaN(amount) || amount < 10000) return
  await prisma.request.create({ data: { companyId: userRow.company.id, type: 'large_amount', payload: { amount }, status: 'pending' } })
  revalidatePath('/pme/dashboard')
}

export default async function LargeAmountPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any).user?.role !== 'pme') redirect('/pme/login')
  const prisma = getPrisma()
  const user = (session as any).user
  const userRow = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } })
  if (!userRow || !userRow.company) redirect('/pme/login')

  return (
    <div className="min-h-screen bg-background">
      <PMENav user={{ name: userRow.name, email: userRow.email, companyName: userRow.company.name, role: "pme" }} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Demande Montant Important</h1>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Nouvelle Demande supérieure à 10 000€</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={submitRequestAction} className="space-y-4">
              <div>
                <Label>Montant</Label>
                <Input name="amount" type="number" placeholder="Montant minimum 10 000" />
              </div>
              <Button type="submit" className="w-full">Soumettre</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
