import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  createAutomation,
  listAutomations,
  getAutomationById,
  updateAutomation,
  deleteAutomation,
  listActiveAutomations,
  createAuditLog,
} from "../db";

export const automationRouter = router({
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        trigger: z.enum(["message_contains", "response_yes", "inactivity_hours"]),
        triggerValue: z.string().min(1, "Valor do gatilho é obrigatório"),
        action: z.enum(["move_stage", "send_message", "add_tag", "assign_user"]),
        actionValue: z.record(z.unknown()).optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const created = await createAutomation({
        name: input.name,
        trigger: input.trigger,
        triggerValue: input.triggerValue,
        action: input.action,
        actionValue: input.actionValue,
        isActive: input.isActive,
      });

      await createAuditLog(ctx.user?.id, "create", "automation", created?.id, {
        name: input.name,
        trigger: input.trigger,
        action: input.action,
      });

      return created;
    }),

  list: protectedProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(false),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      if (input.activeOnly) {
        return await listActiveAutomations();
      }

      return await listAutomations();
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getAutomationById(input.id);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        trigger: z.enum(["message_contains", "response_yes", "inactivity_hours"]).optional(),
        triggerValue: z.string().min(1).optional(),
        action: z.enum(["move_stage", "send_message", "add_tag", "assign_user"]).optional(),
        actionValue: z.record(z.unknown()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const original = await getAutomationById(input.id);

      const updated = await updateAutomation(input.id, {
        name: input.name,
        trigger: input.trigger,
        triggerValue: input.triggerValue,
        action: input.action,
        actionValue: input.actionValue,
        isActive: input.isActive,
      });

      if (original) {
        const changes = {
          before: original,
          after: updated,
        };
        await createAuditLog(ctx.user?.id, "update", "automation", input.id, changes);
      }

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const original = await getAutomationById(input.id);

      await deleteAutomation(input.id);

      await createAuditLog(ctx.user?.id, "delete", "automation", input.id, {
        name: original?.name,
      });

      return { success: true, id: input.id };
    }),
});