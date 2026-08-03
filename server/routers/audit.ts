import { z } from "zod";
import { router, supervisorProcedure } from "../_core/trpc";
import { listAuditLogs, countAuditLogs, listUsers } from "../db";

const auditActionEnum = z.enum([
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "move_kanban",
  "transfer_conversation",
  "send_message",
  "receive_message",
]);

const auditEntityEnum = z.enum([
  "lead",
  "conversation",
  "message",
  "contact",
  "user",
  "automation",
  "ai_config",
  "session",
]);

export const auditRouter = router({
  list: supervisorProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        userId: z.number().optional(),
        action: auditActionEnum.optional(),
        entityType: auditEntityEnum.optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const [logs, total] = await Promise.all([
        listAuditLogs(input.limit, input.offset, {
          userId: input.userId,
          action: input.action,
          entityType: input.entityType,
          startDate: input.startDate,
          endDate: input.endDate,
        }),
        countAuditLogs({
          userId: input.userId,
          action: input.action,
          entityType: input.entityType,
          startDate: input.startDate,
          endDate: input.endDate,
        }),
      ]);

      return {
        logs,
        total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  filters: supervisorProcedure.query(async () => {
    const users = await listUsers();
    return {
      actions: auditActionEnum.options.map((v) => v),
      entityTypes: auditEntityEnum.options.map((v) => v),
      users: users.map((u: { id: number; name: string | null; email: string }) => ({ id: u.id, name: u.name, email: u.email })),
    };
  }),
});
