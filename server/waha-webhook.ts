import { Request, Response } from "express";
import {
  getOrCreateContact,
  getContactByWhatsappNumber,
  updateContactInfo,
  updateContactLastInteraction,
  getOrCreateConversation,
  createMessage,
  getMessageByWaMessageId,
  updateMessageStatusByWaId,
  updateWhatsAppSessionByName,
  updateConversationUnreadCount,
  updateConversationLastMessageAt,
  createAuditLog,
} from "./db";

interface WahaWebhookEvent {
  event: string;
  session: string;
  data: {
    id?: string;
    from?: string;
    to?: string;
    body?: string;
    type?: string;
    media?: {
      url?: string;
      type?: string;
      mimeType?: string;
      caption?: string;
    };
    ack?: number;
    status?: string;
    hasMedia?: boolean;
    isStatusUpdate?: boolean;
    timestamp?: number;
    fromMe?: boolean;
    pushName?: string;
    location?: {
      latitude: number;
      longitude: number;
      description?: string;
    };
  };
}

const SESSION_STATUS_MAP: Record<string, string> = {
  connected: "connected",
  connecting: "connecting",
  disconnected: "disconnected",
  starting: "connecting",
  stopping: "disconnected",
};

const MESSAGE_ACK_MAP: Record<number, "sent" | "delivered" | "read"> = {
  0: "sent",
  1: "sent",
  2: "delivered",
  3: "read",
};

function mapMessageType(wahaType: string): string {
  const typeMap: Record<string, string> = {
    chat: "text",
    image: "image",
    video: "video",
    audio: "audio",
    document: "document",
    location: "location",
    sticker: "image",
    ptt: "audio",
  };
  return typeMap[wahaType] || "text";
}

function extractPhoneNumber(from: string): string {
  return from.replace(/[@c\.]/g, "").replace(/\D/g, "").substring(0, 20);
}

export async function handleWahaWebhook(req: Request, res: Response) {
  try {
    const event: WahaWebhookEvent = req.body;
    const { event: eventType, session: sessionName, data } = event;

    if (!eventType || !sessionName) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    switch (eventType) {
      case "session.status":
      case "session.statusUpdate":
        await handleSessionStatus(sessionName, data);
        break;

      case "message":
        await handleIncomingMessage(sessionName, data);
        break;

      case "message.received":
        await handleIncomingMessage(sessionName, data);
        break;

      case "message.ack":
        await handleMessageAck(sessionName, data);
        break;

      case "message.status":
        await handleMessageStatus(sessionName, data);
        break;

      default:
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[WAHA Webhook] Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleSessionStatus(
  sessionName: string,
  data: WahaWebhookEvent["data"]
) {
  const status = data.status || "disconnected";
  const mappedStatus = SESSION_STATUS_MAP[status.toLowerCase()] || "disconnected";
  const phoneNumber = data.from ? extractPhoneNumber(data.from) : undefined;

  await updateWhatsAppSessionByName(sessionName, {
    status: mappedStatus,
    phoneNumber,
  });

  console.log(
    `[WAHA Webhook] Session ${sessionName} status updated to ${mappedStatus}`
  );
}

async function handleIncomingMessage(
  sessionName: string,
  data: WahaWebhookEvent["data"]
) {
  if (!data.from || data.fromMe !== false) {
    return;
  }

  const phoneNumber = extractPhoneNumber(data.from);
  const messageBody = data.body || "";
  const messageType = mapMessageType(data.type || "chat");
  const waMessageId = data.id;
  const pushName = data.pushName;

  if (!waMessageId) {
    return;
  }

  const existingMessage = await getMessageByWaMessageId(waMessageId);
  if (existingMessage) {
    return;
  }

  const contact = await getOrCreateContact(phoneNumber, pushName);

  if (!contact) {
    console.error(
      `[WAHA Webhook] Failed to get/create contact for ${phoneNumber}`
    );
    return;
  }

  if (pushName && pushName !== contact.name) {
    await updateContactInfo(contact.id, { name: pushName });
  }

  await updateContactLastInteraction(contact.id);

  const conversation = await getOrCreateConversation(contact.id);
  if (!conversation) {
    console.error(
      `[WAHA Webhook] Failed to get/create conversation for contact ${contact.id}`
    );
    return;
  }

  let mediaUrl: string | undefined;
  let content = messageBody;

  if (data.hasMedia && data.media?.url) {
    mediaUrl = data.media.url;
    if (data.media.caption) {
      content = data.media.caption;
    }
  }

  if (messageType === "location" && data.location) {
    content = JSON.stringify({
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      description: data.location.description,
    });
  }

  await createMessage(
    conversation.id,
    messageType,
    content,
    mediaUrl,
    undefined,
    phoneNumber,
    waMessageId
  );

  await updateConversationLastMessageAt(conversation.id);

  if (conversation.unreadCount !== undefined) {
    await updateConversationUnreadCount(
      conversation.id,
      (conversation.unreadCount || 0) + 1
    );
  }

  await createAuditLog(undefined, "receive_message", "message", undefined, {
    sessionName,
    from: phoneNumber,
    type: messageType,
  });
}

async function handleMessageAck(
  sessionName: string,
  data: WahaWebhookEvent["data"]
) {
  const waMessageId = data.id;
  const ack = data.ack;

  if (!waMessageId || ack === undefined) {
    return;
  }

  const status = MESSAGE_ACK_MAP[ack] || "sent";

  await updateMessageStatusByWaId(waMessageId, status);

  await createAuditLog(undefined, "update", "message", undefined, {
    sessionName,
    waMessageId,
    status,
  });
}

async function handleMessageStatus(
  sessionName: string,
  data: WahaWebhookEvent["data"]
) {
  const waMessageId = data.id;
  const status = data.status;

  if (!waMessageId || !status) {
    return;
  }

  const statusMap: Record<string, "sent" | "delivered" | "read"> = {
    SENT: "sent",
    DELIVERED: "delivered",
    READ: "read",
    PENDING: "sent",
  };

  const mappedStatus = statusMap[status.toUpperCase()] || "sent";

  await updateMessageStatusByWaId(waMessageId, mappedStatus);
}
