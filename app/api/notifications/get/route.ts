import { NextRequest, NextResponse } from "next/server"
import { notificationService } from "@/lib/notification-service"

export async function GET(req: NextRequest) {
  try {
    const recipientId = req.nextUrl.searchParams.get("recipientId")
    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true"

    if (!recipientId) {
      return NextResponse.json({ error: "Recipient ID required" }, { status: 400 })
    }

    const notifications = notificationService.getNotifications(recipientId, unreadOnly)

    return NextResponse.json({ notifications })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
