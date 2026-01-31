import type { NotificationEvent } from "./types"
import { audit } from "./audit-logger"

export class NotificationService {
  private notifications: NotificationEvent[] = []

  /**
   * Create and queue a notification
   */
  async notify(
    recipientId: string,
    recipientType: "pme" | "bank" | "admin",
    channel: "email" | "whatsapp" | "sms" | "platform",
    subject: string,
    message: string,
    templateId?: string,
    templateData?: Record<string, any>
  ): Promise<NotificationEvent> {
    const notification: NotificationEvent = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      recipientType,
      channel,
      subject,
      message,
      templateId,
      templateData,
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
    }

    this.notifications.push(notification)

    // Log notification creation
    try {
      audit.log("system", "admin", "NOTIFICATION_CREATED", "notification", notification.id, {
        channel,
        recipientType,
      })
    } catch (auditError) {
      // Silently continue if audit fails
      console.error("[audit] Failed to log notification creation:", auditError)
    }

    // Simulate sending (in real app, this would call external services)
    await this.sendNotification(notification)

    return notification
  }

  /**
   * Send notification via appropriate channel
   */
  private async sendNotification(notification: NotificationEvent): Promise<void> {
    try {
      switch (notification.channel) {
        case "email":
          // Simulate email service call
          console.log(`[Notification] Email to ${notification.recipientId}: ${notification.subject}`)
          break
        case "whatsapp":
          // Simulate WhatsApp service call
          console.log(`[Notification] WhatsApp to ${notification.recipientId}: ${notification.message}`)
          break
        case "sms":
          // Simulate SMS service call
          console.log(`[Notification] SMS to ${notification.recipientId}: ${notification.message}`)
          break
        case "platform":
          // Store in-app notification
          console.log(`[Notification] Platform notification for ${notification.recipientId}`)
          break
      }

      notification.status = "sent"
      notification.sentAt = new Date().toISOString()

      try {
        audit.log("system", "admin", "NOTIFICATION_SENT", "notification", notification.id, {
          channel: notification.channel,
          status: "sent",
        })
      } catch (auditError) {
        console.error("[audit] Failed to log notification sent:", auditError)
      }
    } catch (error) {
      notification.status = "failed"
      notification.failureReason = error instanceof Error ? error.message : "Unknown error"
      notification.retryCount++

      try {
        audit.log(
          "system",
          "admin",
          "NOTIFICATION_FAILED",
          "notification",
          notification.id,
          { channel: notification.channel },
          "failure",
          notification.failureReason
        )
      } catch (auditError) {
        console.error("[audit] Failed to log notification failed:", auditError)
      }
    }
  }

  /**
   * Get notifications for recipient
   */
  getNotifications(recipientId: string, unreadOnly: boolean = false): NotificationEvent[] {
    let filtered = this.notifications.filter((n) => n.recipientId === recipientId)
    if (unreadOnly) {
      filtered = filtered.filter((n) => n.status !== "read")
    }
    return filtered.sort((a, b) => new Date(b.sentAt || "").getTime() - new Date(a.sentAt || "").getTime())
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.status = "read"
      notification.readAt = new Date().toISOString()
    }
  }
}

export const notificationService = new NotificationService()
