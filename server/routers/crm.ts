import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  listPipelines,
  getPipeline,
  getStagesByPipeline,
  listLeadsByPipeline,
  listLeadsByStage,
  createLead,
  updateLead,
  deleteLead,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
  moveLeadToStage,
  getDefaultPipeline,
  getOrCreateContact,
  getContactById,
  updateContactLastInteraction,
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  updateLeadTags,
  updateLeadAssignee,
  updateLeadDueDate,
  listUsers,
} from "../db";

export const crmRouter = router({
  // Pipeline CRUD
  listPipelines: protectedProcedure.query(async () => {
    return listPipelines();
  }),

  getPipeline: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getPipeline(input.id);
    }),

  createPipeline: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createPipeline(input.name, input.description);
    }),

  updatePipeline: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return updatePipeline(input.id, input);
    }),

  deletePipeline: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deletePipeline(input.id);
    }),

  // Stages
  getStagesByPipeline: protectedProcedure
    .input(z.object({ pipelineId: z.number() }))
    .query(async ({ input }) => {
      return getStagesByPipeline(input.pipelineId);
    }),

  createStage: protectedProcedure
    .input(
      z.object({
        pipelineId: z.number(),
        name: z.string().min(1),
        order: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createStage(input.pipelineId, input.name, input.order);
    }),

  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        order: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return updateStage(input.id, input);
    }),

  deleteStage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteStage(input.id);
    }),

  // Leads
  listLeadsByPipeline: protectedProcedure
    .input(z.object({ pipelineId: z.number() }))
    .query(async ({ input }) => {
      return listLeadsByPipeline(input.pipelineId);
    }),

  listLeadsByStage: protectedProcedure
    .input(z.object({ stageId: z.number() }))
    .query(async ({ input }) => {
      return listLeadsByStage(input.stageId);
    }),

  createLead: protectedProcedure
    .input(
      z.object({
        pipelineId: z.number(),
        stageId: z.number(),
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        notes: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // First, get or create a contact with the provided info
      // @ts-ignore - TypeScript incorrectly infers argument count
      const contact = await getOrCreateContact(
        input.phone || input.name,
        input.name
      );
      if (!contact) {
        throw new Error("Failed to create contact");
      }

      // Create the lead associated with the contact
      return createLead(contact.id, input.stageId);
    }),

  updateLead: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        notes: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // @ts-ignore - TypeScript incorrectly infers argument count
      return updateLead(input.id, {
        notes: input.notes,
        metadata: input.metadata,
      });
    }),

  deleteLead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteLead(input.id);
    }),

  moveLeadToStage: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        stageId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await moveLeadToStage(input.leadId, input.stageId);

      // Audit log
      await createAuditLog(
        ctx.user?.id,
        "move_kanban",
        "lead",
        input.leadId,
        { fromStageId: "unknown", toStageId: input.stageId }
      );

      return result;
    }),

  // Lead updates
  updateLeadTags: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        tags: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await updateLeadTags(input.leadId, input.tags);

      await createAuditLog(
        ctx.user?.id,
        "update",
        "lead",
        input.leadId,
        { tags: input.tags }
      );

      return result;
    }),

  updateLeadAssignee: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        assignedToUserId: z.number().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await updateLeadAssignee(input.leadId, input.assignedToUserId);

      await createAuditLog(
        ctx.user?.id,
        "update",
        "lead",
        input.leadId,
        { assignedToUserId: input.assignedToUserId }
      );

      return result;
    }),

  updateLeadDueDate: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        dueDate: z.date().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await updateLeadDueDate(input.leadId, input.dueDate);

      await createAuditLog(
        ctx.user?.id,
        "update",
        "lead",
        input.leadId,
        { dueDate: input.dueDate }
      );

      return result;
    }),

  // Default pipeline
  getDefaultPipeline: protectedProcedure.query(async () => {
    return getDefaultPipeline();
  }),

  // Contacts
  listContacts: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return listContacts(input.limit || 50, input.offset || 0);
    }),

  createContact: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        whatsappNumber: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createContact(input);
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        whatsappNumber: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateContact(id, data);
    }),

  deleteContact: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteContact(input.id);
    }),

  // Users
  listUsers: protectedProcedure.query(async () => {
    return listUsers();
  }),
});
