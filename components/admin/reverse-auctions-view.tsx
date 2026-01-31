"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AuctionsList from "@/components/admin/auctions-list"
import AuctionDetails from "@/components/admin/auction-details"

interface ReverseAuctionsViewProps {
  adminId: string
}

export default function ReverseAuctionsView({ adminId }: ReverseAuctionsViewProps) {
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"list" | "details">("list")

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "list" | "details")} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list">Enchères</TabsTrigger>
        <TabsTrigger value="details">{selectedAuctionId ? "Détails" : "Sélectionnez une enchère"}</TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <AuctionsList
          onSelectAuction={(id) => {
            setSelectedAuctionId(id)
            setActiveTab("details")
          }}
          onSwitchTab={(tab) => setActiveTab(tab as "list" | "details")}
        />
      </TabsContent>

      <TabsContent value="details">
        {selectedAuctionId ? (
          <AuctionDetails auctionId={selectedAuctionId} adminId={adminId} />
        ) : (
          <p className="text-muted-foreground">Sélectionnez une enchère pour voir les détails</p>
        )}
      </TabsContent>
    </Tabs>
  )
}


