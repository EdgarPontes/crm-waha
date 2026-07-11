import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  createWhatsAppSession,
  getWhatsAppSessionByName,
  listWhatsAppSessions,
  updateWhatsAppSessionStatus,
  createAuditLog,
} from "../db";

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
        const session = await createWhatsAppSession(input.sessionName);

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

    getQR: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        // This would typically call WAHA API to get QR code
        // For now, returning a placeholder
        return {
          sessionId: input.sessionId,
          qrCode: null,
          status: "connecting",
        };
      }),

    disconnect: adminProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const result = await updateWhatsAppSessionStatus(
          input.sessionId,
          "disconnected"
        );

        await createAuditLog(
          ctx.user?.id,
          "update",
          "session",
          input.sessionId,
          { action: "disconnect" }
        );

        return result;
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
        // This would call WAHA API to send message
        // Placeholder implementation
        return {
          success: true,
          messageId: `msg_${Date.now()}`,
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
        // This would call WAHA API to send media
        // Placeholder implementation
        return {
          success: true,
          messageId: `msg_${Date.now()}`,
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
        // This would call WAHA API to send location
        // Placeholder implementation
        return {
          success: true,
          messageId: `msg_${Date.now()}`,
          sessionName: input.sessionName,
          phoneNumber: input.phoneNumber,
          latitude: input.latitude,
          longitude: input.longitude,
        };
      }),
  }),
});
