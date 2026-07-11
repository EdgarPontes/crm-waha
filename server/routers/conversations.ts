import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getOrCreateConversation,
  getConversationById,
  listConversations,
  updateConversationStatus,
  assignConversationToUser,
  createMessage,
  listMessagesByConversation,
  createNote,
  listNotesByConversation,
  createAuditLog,
  getContactById,
} from "../db";

export const conversationsRouter = router({
  // ========================================================================
  // CONVERSATIONS
  // ========================================================================
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "waiting_human", "closed"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return await listConversations(input.status, input.limit, input.offset);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const conversation = await getConversationById(input.id);
      if (!conversation) return null;

      // Fetch contact details
      const contact = conversation.contactId
        ? await getContactById(conversation.contactId)
        : null;

      // Fetch messages
      const messages = await listMessagesByConversation(input.id, 50, 0);

      // Fetch notes
      const notes = await listNotesByConversation(input.id);

      return {
        ...conversation,
        contact,
        messages,
        notes,
      };
    }),

  getOrCreate: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await getOrCreateConversation(input.contactId, input.leadId);
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        status: z.enum(["active", "waiting_human", "closed"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await updateConversationStatus(
        input.conversationId,
        input.status
      );

      await createAuditLog(
        ctx.user?.id,
        "update",
        "conversation",
        input.conversationId,
        { field: "status", value: input.status }
      );

      return result;
    }),

  assignToUser: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await assignConversationToUser(
        input.conversationId,
        input.userId
      );

      await createAuditLog(
        ctx.user?.id,
        "transfer_conversation",
        "conversation",
        input.conversationId,
        { assignedTo: input.userId }
      );

      return result;
    }),

  requestHuman: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await updateConversationStatus(
        input.conversationId,
        "waiting_human"
      );

      await createAuditLog(
        ctx.user?.id,
        "update",
        "conversation",
        input.conversationId,
        { reason: "human_requested" }
      );

      return result;
    }),

  // ========================================================================
  // MESSAGES
  // ========================================================================
  messages: router({
    list: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return await listMessagesByConversation(
          input.conversationId,
          input.limit,
          input.offset
        );
      }),

    send: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          type: z.enum([
            "text",
            "image",
            "audio",
            "video",
            "document",
            "location",
          ]),
          content: z.string().optional(),
          mediaUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const message = await createMessage(
          input.conversationId,
          input.type,
          input.content,
          input.mediaUrl,
          ctx.user?.id
        );

        await createAuditLog(
          ctx.user?.id,
          "send_message",
          "message",
          message?.id,
          { type: input.type }
        );

        return message;
      }),
  }),

  // ========================================================================
  // NOTES
  // ========================================================================
  notes: router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await listNotesByConversation(input.conversationId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) return null;

        const note = await createNote(
          input.conversationId,
          ctx.user.id,
          input.content
        );

        await createAuditLog(ctx.user.id, "create", "note", note?.id, {
          conversationId: input.conversationId,
        });

        return note;
      }),
  }),
});
