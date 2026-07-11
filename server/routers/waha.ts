import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getWAHAClient } from "../waha-client";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import {
  whatsappSessions,
  contacts,
  conversations,
  messages,
} from "../../drizzle/schema";
import {
  getOrCreateContact,
  getOrCreateConversation,
  createMessage,
  updateContactLastInteraction,
} from "../db";

export const wahaRouter = router({
  // Listar todas as sessões
  listSessions: protectedProcedure.query(async () => {
    try {
      const wahaClient = getWAHAClient();
      const sessions = await wahaClient.listSessions();
      return sessions;
    } catch (error) {
      console.error("[Router] Erro ao listar sessões:", error);
      return [];
    }
  }),

  // Obter informações de uma sessão
  getSession: protectedProcedure
    .input(z.object({ sessionName: z.string() }))
    .query(async ({ input }) => {
      try {
        const wahaClient = getWAHAClient();
        const session = await wahaClient.getSession(input.sessionName);
        return session;
      } catch (error) {
        console.error("[Router] Erro ao obter sessão:", error);
        throw error;
      }
    }),

  // Criar nova sessão
  createSession: protectedProcedure
    .input(z.object({ sessionName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const wahaClient = getWAHAClient();
        const session = await wahaClient.createSession(input.sessionName);

        // Salvar no banco de dados
        const db = await getDb();
        if (db) {
          await db.insert(whatsappSessions).values({
            sessionName: input.sessionName,
            phoneNumber: "",
            status: "connecting",
          });
        }

        return session;
      } catch (error) {
        console.error("[Router] Erro ao criar sessão:", error);
        throw error;
      }
    }),

  // Obter QR Code
  getQRCode: protectedProcedure
    .input(z.object({ sessionName: z.string() }))
    .query(async ({ input }) => {
      try {
        const wahaClient = getWAHAClient();
        const qrCode = await wahaClient.getQRCode(input.sessionName);
        return { qrCode };
      } catch (error) {
        console.error("[Router] Erro ao obter QR Code:", error);
        throw error;
      }
    }),

  // Desconectar sessão
  disconnectSession: protectedProcedure
    .input(z.object({ sessionName: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const wahaClient = getWAHAClient();
        await wahaClient.disconnectSession(input.sessionName);

        // Atualizar status no banco
        const db = await getDb();
        if (db) {
          await db
            .update(whatsappSessions)
            .set({ status: "disconnected" })
            .where(eq(whatsappSessions.sessionName, input.sessionName));
        }

        return { success: true };
      } catch (error) {
        console.error("[Router] Erro ao desconectar sessão:", error);
        throw error;
      }
    }),

  // Deletar sessão
  deleteSession: protectedProcedure
    .input(z.object({ sessionName: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const wahaClient = getWAHAClient();
        await wahaClient.deleteSession(input.sessionName);

        // Deletar do banco
        const db = await getDb();
        if (db) {
          await db
            .delete(whatsappSessions)
            .where(eq(whatsappSessions.sessionName, input.sessionName));
        }

        return { success: true };
      } catch (error) {
        console.error("[Router] Erro ao deletar sessão:", error);
        throw error;
      }
    }),

  // Enviar mensagem
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionName: z.string(),
        chatId: z.string(),
        text: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const wahaClient = getWAHAClient();
        const result = await wahaClient.sendMessage(
          input.sessionName,
          input.chatId,
          input.text
        );

        // Salvar mensagem no banco
        const db = await getDb();
        if (db) {
          // Extrair número do chatId (formato: 5511999999999@c.us)
          const phoneNumber = input.chatId.split("@")[0];

          // Obter ou criar contato
          const contact = await getOrCreateContact(phoneNumber);

          if (contact) {
            // Obter ou criar conversa
            const conversation = await getOrCreateConversation(contact.id);

            if (conversation) {
              // Criar mensagem
              await createMessage(
                conversation.id,
                "text",
                input.text,
                undefined,
                ctx.user?.id,
                input.chatId,
                result?.messageId || result?.id
              );

              // Atualizar última interação
              await updateContactLastInteraction(contact.id);
            }
          }
        }

        return result;
      } catch (error) {
        console.error("[Router] Erro ao enviar mensagem:", error);
        throw error;
      }
    }),

  // Enviar mídia
  sendMedia: protectedProcedure
    .input(
      z.object({
        sessionName: z.string(),
        chatId: z.string(),
        mediaUrl: z.string(),
        mediaType: z.enum(["image", "video", "audio", "document"]),
        caption: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const wahaClient = getWAHAClient();
        const result = await wahaClient.sendMediaMessage(
          input.sessionName,
          input.chatId,
          input.mediaUrl,
          input.mediaType,
          input.caption
        );

        // Salvar mensagem no banco
        const db = await getDb();
        if (db) {
          const phoneNumber = input.chatId.split("@")[0];
          const contact = await getOrCreateContact(phoneNumber);

          if (contact) {
            const conversation = await getOrCreateConversation(contact.id);

            if (conversation) {
              const messageTypeMap: Record<string, string> = {
                image: "image",
                video: "video",
                audio: "audio",
                document: "document",
              };

              await createMessage(
                conversation.id,
                messageTypeMap[input.mediaType] || "document",
                input.caption,
                input.mediaUrl,
                ctx.user?.id,
                input.chatId,
                result?.messageId || result?.id
              );

              await updateContactLastInteraction(contact.id);
            }
          }
        }

        return result;
      } catch (error) {
        console.error("[Router] Erro ao enviar mídia:", error);
        throw error;
      }
    }),

  // Enviar localização
  sendLocation: protectedProcedure
    .input(
      z.object({
        sessionName: z.string(),
        chatId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const wahaClient = getWAHAClient();
        const result = await wahaClient.sendLocationMessage(
          input.sessionName,
          input.chatId,
          input.latitude,
          input.longitude,
          input.name
        );

        // Salvar mensagem no banco
        const db = await getDb();
        if (db) {
          const phoneNumber = input.chatId.split("@")[0];
          const contact = await getOrCreateContact(phoneNumber);

          if (contact) {
            const conversation = await getOrCreateConversation(contact.id);

            if (conversation) {
              await createMessage(
                conversation.id,
                "location",
                input.name || "Localização compartilhada",
                undefined,
                ctx.user?.id,
                input.chatId,
                result?.messageId || result?.id,
                {
                  latitude: input.latitude,
                  longitude: input.longitude,
                  name: input.name,
                }
              );

              await updateContactLastInteraction(contact.id);
            }
          }
        }

        return result;
      } catch (error) {
        console.error("[Router] Erro ao enviar localização:", error);
        throw error;
      }
    }),

  // Obter mensagens de um chat
  getMessages: protectedProcedure
    .input(
      z.object({
        sessionName: z.string(),
        chatId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const wahaClient = getWAHAClient();
        const messages = await wahaClient.getMessages(
          input.sessionName,
          input.chatId,
          input.limit
        );
        return messages;
      } catch (error) {
        console.error("[Router] Erro ao obter mensagens:", error);
        throw error;
      }
    }),

  // Registrar webhook
  registerWebhook: protectedProcedure
    .input(
      z.object({
        sessionName: z.string(),
        webhookUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const wahaClient = getWAHAClient();
        const result = await wahaClient.registerWebhook(
          input.sessionName,
          input.webhookUrl
        );
        return result;
      } catch (error) {
        console.error("[Router] Erro ao registrar webhook:", error);
        throw error;
      }
    }),
});
