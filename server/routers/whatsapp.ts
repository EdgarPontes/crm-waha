import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getWAHAClient } from "../waha-client";
import { getDb } from "../db";
import { whatsappSessions } from "../../drizzle/schema";
import {
  createWhatsAppSession,
  getWhatsAppSessionByName,
  listWhatsAppSessions,
  updateWhatsAppSessionStatus,
  updateWhatsAppSessionByName,
  createAuditLog,
} from "../db";
import { registerWahaWebhook } from "../waha-monitor";

export const whatsappRouter = router({
  sessions: router({
    list: protectedProcedure.query(async () => {
      return await listWhatsAppSessions();
    }),

    get: protectedProcedure
      .input(z.object({ sessionName: z.string() }))
      .query(async ({ input }) => {
        return await getWhatsAppSessionByName(input.sessionName);
      }),

    create: adminProcedure
      .input(z.object({ sessionName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // 1. Cria a sessão na API WAHA com webhook embutido
        const port = parseInt(process.env.PORT || "3000");
        const webhookBaseUrl = process.env.WAHA_WEBHOOK_URL || `http://localhost:${port}`;
        const webhookUrl = `${webhookBaseUrl}/api/waha/webhook`;

        const wahaClient = await getWAHAClient();
        await wahaClient.createSession(input.sessionName, webhookUrl);

        // 2. Registra/upsert no banco de dados
        const db = await getDb();
        if (db) {
          await db
            .insert(whatsappSessions)
            .values({
              sessionName: input.sessionName,
              status: "connecting",
            })
            .onConflictDoUpdate({
              target: whatsappSessions.sessionName,
              set: {
                status: "connecting",
                updatedAt: new Date(),
              },
            });
        }

        const session = await getWhatsAppSessionByName(input.sessionName);

        await createAuditLog(ctx.user?.id, "create", "session", session?.id, {
          sessionName: input.sessionName,
        });

        return session;
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          sessionId: z.number(),
          status: z.enum(["disconnected", "connecting", "connected", "error"]),
          qrCode: z.string().optional(),
          phoneNumber: z.string().optional(),
          errorMessage: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await updateWhatsAppSessionStatus(
          input.sessionId,
          input.status,
          input.qrCode,
          input.phoneNumber,
          input.errorMessage
        );

        await createAuditLog(
          ctx.user?.id,
          "update",
          "session",
          input.sessionId,
          { status: input.status }
        );

        return result;
      }),

    // Obter QR Code chamando a API WAHA
    getQR: protectedProcedure
      .input(z.object({ sessionName: z.string() }))
      .query(async ({ input }) => {
        const wahaClient = await getWAHAClient();

        // First check if session exists in WAHA, or create/start it
        let sessionInfo;
        try {
          sessionInfo = await wahaClient.getSession(input.sessionName);
        } catch {
          try {
            sessionInfo = await wahaClient.createSession(input.sessionName);
          } catch (err) {
            throw new Error(`Sessão "${input.sessionName}" não encontrada no WAHA: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
          }
        }

        const statusUpper = String(sessionInfo?.status || "").toUpperCase();
        if (statusUpper === "STOPPED" || statusUpper === "DISCONNECTED") {
          try {
            await wahaClient.startSession(input.sessionName);
          } catch {
            await wahaClient.createSession(input.sessionName);
          }
        }

        // Get QR code
        let qrCode;
        try {
          qrCode = await wahaClient.getQRCode(input.sessionName);
        } catch (err) {
          throw new Error(`Erro ao obter QR Code: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
        }

        if (!qrCode) {
          // Session might still be starting
          throw new Error("QR Code ainda não disponível. A sessão pode ainda estar iniciando. Tente novamente em alguns segundos.");
        }

        // Atualiza o QR Code no banco
        await updateWhatsAppSessionByName(input.sessionName, {
          status: "connecting",
          qrCode,
        });

        return {
          sessionName: input.sessionName,
          qrCode,
          status: "connecting",
        };
      }),

    disconnect: adminProcedure
      .input(z.object({ sessionName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // 1. Desconecta na API WAHA
        const wahaClient = await getWAHAClient();
        await wahaClient.disconnectSession(input.sessionName);

        // 2. Atualiza o status no banco
        await updateWhatsAppSessionByName(input.sessionName, {
          status: "disconnected",
        });

        const session = await getWhatsAppSessionByName(input.sessionName);

        await createAuditLog(
          ctx.user?.id,
          "update",
          "session",
          session?.id,
          { action: "disconnect" }
        );

        return session;
      }),
  }),

  // ========================================================================
  // MESSAGE SENDING (via WAHA)
  // ========================================================================
  messages: router({
    sendText: protectedProcedure
      .input(
        z.object({
          sessionName: z.string(),
          phoneNumber: z.string(),
          text: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const wahaClient = await getWAHAClient();
        const chatId = input.phoneNumber.includes("@")
          ? input.phoneNumber
          : `${input.phoneNumber}@c.us`;
        const result = await wahaClient.sendMessage(
          input.sessionName,
          chatId,
          input.text
        );

        return {
          success: true,
          messageId: result?.messageId || result?.id || `msg_${Date.now()}`,
          sessionName: input.sessionName,
          phoneNumber: input.phoneNumber,
          text: input.text,
        };
      }),

    sendMedia: protectedProcedure
      .input(
        z.object({
          sessionName: z.string(),
          phoneNumber: z.string(),
          mediaUrl: z.string(),
          mediaType: z.enum(["image", "audio", "video", "document"]),
          caption: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const wahaClient = await getWAHAClient();
        const chatId = input.phoneNumber.includes("@")
          ? input.phoneNumber
          : `${input.phoneNumber}@c.us`;
        const result = await wahaClient.sendMediaMessage(
          input.sessionName,
          chatId,
          input.mediaUrl,
          input.mediaType,
          input.caption
        );

        return {
          success: true,
          messageId: result?.messageId || result?.id || `msg_${Date.now()}`,
          sessionName: input.sessionName,
          phoneNumber: input.phoneNumber,
          mediaType: input.mediaType,
        };
      }),

    sendLocation: protectedProcedure
      .input(
        z.object({
          sessionName: z.string(),
          phoneNumber: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          name: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const wahaClient = await getWAHAClient();
        const chatId = input.phoneNumber.includes("@")
          ? input.phoneNumber
          : `${input.phoneNumber}@c.us`;
        const result = await wahaClient.sendLocationMessage(
          input.sessionName,
          chatId,
          input.latitude,
          input.longitude,
          input.name
        );

        return {
          success: true,
          messageId: result?.messageId || result?.id || `msg_${Date.now()}`,
          sessionName: input.sessionName,
          phoneNumber: input.phoneNumber,
          latitude: input.latitude,
          longitude: input.longitude,
        };
      }),
  }),
});
