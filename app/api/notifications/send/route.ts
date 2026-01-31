import { NextRequest, NextResponse } from "next/server"
import { notificationService } from "@/lib/notification-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { recipientId, recipientType, channel, subject, message, templateId, templateData } = body

    if (!recipientId || !recipientType || !channel || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const notification = await notificationService.notify(
      recipientId,
      recipientType,
      channel,
      subject,
      message,
      templateId,
      templateData
    )

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
