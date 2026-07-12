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
  listMessagesByConversation,
  getActiveAIConfiguration,
  getLeadById,
  getDefaultPipeline,
  getStagesByPipeline,
} from "./db";
import { aiService, type ChatMessage, type AIConfig } from "./services/ai";
import { getWAHAClient } from "./waha-client";
import { checkAndExecuteAutomations } from "./services/automation";

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

  // Check and execute automations based on the message
  await checkAndExecuteAutomations({
    conversationId: conversation.id,
    sessionName,
    from: data.from,
    phoneNumber,
    userMessage: messageBody,
    contactId: contact.id,
  });

  // Process AI response if conversation is active and AI is configured
  await processAIResponse(sessionName, conversation.id, contact.id, messageBody, phoneNumber);
}

async function processAIResponse(
  sessionName: string,
  conversationId: number,
  contactId: number,
  userMessage: string,
  phoneNumber: string
) {
  try {
    // Check if conversation is active and not waiting for human
    const conversation = await getOrCreateConversation(contactId);
    if (!conversation || conversation.status !== "active") {
      return;
    }

    // Check if AI is active
    const aiConfig = await getActiveAIConfiguration();
    if (!aiConfig || !aiConfig.isActive) {
      return;
    }

    // Check if this is a handoff request
    if (detectHandoffRequest(userMessage)) {
      await handleHandoffRequest(conversationId);
      return;
    }

    // Get conversation history for context
    const messages = await listMessagesByConversation(conversationId, 10, 0);
    const chatHistory: ChatMessage[] = messages
      .reverse()
      .map((msg) => ({
        role: msg.senderId ? "assistant" : "user",
        content: msg.content || "",
      }));

    // Add current user message
    chatHistory.push({ role: "user", content: userMessage });

    // Get lead context if exists
    let systemPrompt = aiConfig.systemPrompt || "Você é um atendente de vendas profissional e útil.";
    
    if (conversation.leadId) {
      const lead = await getLeadById(conversation.leadId);
      if (lead) {
        const pipeline = await getDefaultPipeline();
        if (pipeline) {
          const stages = await getStagesByPipeline(pipeline.id);
          const currentStage = stages.find(s => s.id === lead.stageId);
          systemPrompt += `\n\nContexto do Lead:`;
          systemPrompt += `\n- Estágio atual: ${currentStage?.name || "Desconhecido"}`;
          systemPrompt += `\n- Tags: ${lead.tags?.join(", ") || "Nenhuma"}`;
          systemPrompt += `\n- Observações: ${lead.notes || "Nenhuma"}`;
        }
      }
    }

    // Generate AI response
    const aiResponse = await aiService.generateResponse(
      {
        provider: aiConfig.provider as any,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        systemPrompt,
        temperature: Number(aiConfig.temperature) || 0.7,
        maxTokens: aiConfig.maxTokens || 2000,
      },
      chatHistory
    );

    if (!aiResponse) {
      return;
    }

    // Send response via WAHA
    const wahaClient = getWAHAClient(sessionName);
    await wahaClient.sendMessage(phoneNumber, aiResponse);

    // Save AI response to database
    await createMessage(
      conversationId,
      "text",
      aiResponse,
      undefined,
      undefined, // senderId (AI)
      undefined,
      undefined, // waMessageId (not from WAHA)
      { aiGenerated: true }
    );

    await createAuditLog(undefined, "send_message", "message", undefined, {
      sessionName,
      to: phoneNumber,
      type: "text",
      aiGenerated: true,
    });

  } catch (error) {
    console.error("[WAHA Webhook] Error processing AI response:", error);
  }
}

function detectHandoffRequest(message: string): boolean {
  const handoffKeywords = [
    "humano", "atendente", "pessoa real", "falar com alguém",
    "reclamação", "reclamar", "insatisfeito", "problema grave",
    "urgente", "emergência", "supervisor", "gerente",
    "cancelar", "não quero mais", "desistir",
  ];
  
  const lowerMessage = message.toLowerCase();
  return handoffKeywords.some((keyword) => lowerMessage.includes(keyword));
}

async function handleHandoffRequest(conversationId: number) {
  try {
    // Update conversation status to waiting_human
    await createAuditLog(undefined, "update", "conversation", conversationId, {
      field: "status",
      value: "waiting_human",
      reason: "handoff_requested_by_client",
    });

    // Could send a message saying "Transferindo para atendente humano..."
    // This would be implemented based on your needs
  } catch (error) {
    console.error("[WAHA Webhook] Error handling handoff request:", error);
  }
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
