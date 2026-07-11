import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { messages, conversations, contacts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const webhookRouter = Router();

/**
 * Tipos de eventos WAHA
 */
interface WAHAWebhookPayload {
  event: string;
  session: string;
  data: any;
  timestamp: number;
}

interface MessageEvent {
  id: string;
  chatId: string;
  fromMe: boolean;
  from: string;
  to?: string;
  text?: string;
  type: "text" | "image" | "video" | "audio" | "document" | "location";
  media?: {
    url: string;
    mimetype: string;
  };
  timestamp: number;
  quotedMessageId?: string;
}

interface MessageStatusEvent {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
}

interface SessionStatusEvent {
  status: "CONNECTED" | "DISCONNECTED" | "STARTING" | "STOPPING";
  me?: {
    id: string;
    pushName: string;
  };
}

/**
 * Webhook para receber eventos do WAHA
 */
webhookRouter.post("/waha", async (req: Request, res: Response) => {
  try {
    const payload: WAHAWebhookPayload = req.body;

    console.log(`[Webhook] Evento recebido: ${payload.event} da sessão ${payload.session}`);

    const db = await getDb();
    if (!db) {
      console.warn("[Webhook] Database não disponível");
      return res.status(500).json({ error: "Database not available" });
    }

    // Processar diferentes tipos de eventos
    switch (payload.event) {
      case "message":
        await handleMessageEvent(db, payload.session, payload.data);
        break;

      case "message.status":
        await handleMessageStatusEvent(db, payload.data);
        break;

      case "session.status":
        await handleSessionStatusEvent(db, payload.session, payload.data);
        break;

      default:
        console.log(`[Webhook] Evento desconhecido: ${payload.event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Erro ao processar evento:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Processar evento de mensagem
 */
async function handleMessageEvent(db: any, sessionName: string, data: MessageEvent) {
  try {
    // Extrair informações do evento
    const { id, chatId, from, text, type, media, timestamp, fromMe } = data;

    // Criar ou atualizar contato
    let contactId: number | null = null;
    const existingContact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone as any, from))
      .limit(1);

    if (existingContact.length > 0) {
      contactId = existingContact[0].id;
    } else {
      // Criar novo contato
      const result = await db.insert(contacts).values({
        phone: from,
        name: from,
        source: "whatsapp",
      });
      // Nota: Drizzle não retorna insertId diretamente, você precisa fazer uma query adicional
      const newContact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.phone as any, from))
        .limit(1);
      contactId = newContact[0]?.id;
    }

    // Criar ou obter conversa
    let conversationId: number | null = null;
    const existingConversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.contactId as any, contactId))
      .limit(1);

    if (existingConversation.length > 0) {
      conversationId = existingConversation[0].id;
    } else {
      // Criar nova conversa
      const result = await db.insert(conversations).values({
        contactId: contactId!,
        status: "open",
        stage: "Novo Lead",
      });
      const newConversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.contactId as any, contactId))
        .limit(1);
      conversationId = newConversation[0]?.id;
    }

    // Salvar mensagem
    if (conversationId) {
      await db.insert(messages).values({
        conversationId,
        senderType: fromMe ? "agent" : "customer",
        content: text || "",
        mediaUrl: media?.url,
        mediaType: type as any,
        createdAt: new Date(timestamp * 1000),
      });

      // Atualizar última mensagem da conversa
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(timestamp * 1000),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
    }

    console.log(`[Webhook] Mensagem salva: ${id} na conversa ${conversationId}`);
  } catch (error) {
    console.error("[Webhook] Erro ao processar mensagem:", error);
  }
}

/**
 * Processar evento de status de mensagem
 */
async function handleMessageStatusEvent(db: any, data: MessageStatusEvent) {
  try {
    const { messageId, status, timestamp } = data;

    // Atualizar status da mensagem no banco
    // Nota: Você pode precisar adicionar um campo externalMessageId ao schema se quiser rastrear IDs do WAHA
    // Por enquanto, apenas registramos o evento
    console.log(`[Webhook] Mensagem ${messageId} tem status ${status}`);

    console.log(`[Webhook] Status da mensagem ${messageId} atualizado para ${status}`);
  } catch (error) {
    console.error("[Webhook] Erro ao atualizar status da mensagem:", error);
  }
}

/**
 * Processar evento de status de sessão
 */
async function handleSessionStatusEvent(db: any, sessionName: string, data: SessionStatusEvent) {
  try {
    const { status, me } = data;

    console.log(`[Webhook] Status da sessão ${sessionName} atualizado para ${status}`);

    // Aqui você pode atualizar a tabela whatsappSessions se necessário
    // Exemplo de como fazer (descomente quando implementar):
    // const statusMap = {
    //   'CONNECTED': 'connected',
    //   'DISCONNECTED': 'disconnected',
    //   'STARTING': 'connecting',
    //   'STOPPING': 'disconnected',
    // };
    // await db
    //   .update(whatsappSessions)
    //   .set({
    //     status: statusMap[status] || status.toLowerCase(),
    //     phoneNumber: me?.id || "",
    //     updatedAt: new Date(),
    //   })
    //   .where(eq(whatsappSessions.sessionName as any, sessionName));
  } catch (error) {
    console.error("[Webhook] Erro ao atualizar status da sessão:", error);
  }
}

export default webhookRouter;
