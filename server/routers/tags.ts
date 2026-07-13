import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  createTag,
  listTags,
  getTagByName,
  deleteTag,
  updateTag,
  addTagToLead,
  removeTagFromLead,
  updateLeadTags,
  createAuditLog,
} from "../db";

export const tagsRouter = router({
  // Tag management (admin)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser hex válida").default("#3b82f6"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await getTagByName(input.name);
      if (existing) {
        throw new Error("Tag já existe");
      }

      const created = await createTag(input.name, input.color);

      await createAuditLog(ctx.user?.id, "create", "tag", created?.id, {
        name: input.name,
        color: input.color,
      });

      return created;
    }),

  list: protectedProcedure.query(async () => {
    return listTags();
  }),

  get: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return getTagByName(input.name);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const original = await getTagByName(input.name || "");
      const updated = await updateTag(input.id, {
        name: input.name,
        color: input.color,
      });

      await createAuditLog(ctx.user?.id, "update", "tag", input.id, {
        before: original,
        after: updated,
      });

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteTag(input.id);

      await createAuditLog(ctx.user?.id, "delete", "tag", input.id, {});

      return { success: true, id: input.id };
    }),

  // Lead tag operations
  addToLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        tagName: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await addTagToLead(input.leadId, input.tagName);

      await createAuditLog(ctx.user?.id, "add_tag", "lead", input.leadId, {
        tagName: input.tagName,
      });

      return result;
    }),

  removeFromLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        tagName: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await removeTagFromLead(input.leadId, input.tagName);

      await createAuditLog(ctx.user?.id, "remove_tag", "lead", input.leadId, {
        tagName: input.tagName,
      });

      return result;
    }),

  updateLeadTags: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        tags: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await updateLeadTags(input.leadId, input.tags);

      await createAuditLog(ctx.user?.id, "update", "lead", input.leadId, {
        tags: input.tags,
      });

      return result;
    }),
});