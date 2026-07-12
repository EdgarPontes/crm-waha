import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  addToAttendanceQueue,
  getAttendanceQueueItem,
  listAttendanceQueue,
  assignQueueItem,
} from "../db";
import { createAuditLog, updateConversationStatus, listUsers } from "../db";

export const attendanceQueueRouter = router({
  // Add conversation to attendance queue
  enqueue: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        contactId: z.number(),
        priority: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await addToAttendanceQueue(
        input.conversationId,
        input.contactId,
        input.priority
      );

      // Update conversation status
      await updateConversationStatus(input.conversationId, "waiting_human");

      await createAuditLog(ctx.user?.id, "enqueue", "attendance_queue", result?.id, {
        conversationId: input.conversationId,
      });

      return result;
    }),

  // Get queue item for a conversation
  getByConversation: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      return await getAttendanceQueueItem(input.conversationId);
    }),

  // List queue items with filters
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        assignedUserId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return await listAttendanceQueue(
        input.status,
        input.assignedUserId,
        input.limit,
        input.offset
      );
    }),

  // Assign queue item to agent
  assign: protectedProcedure
    .input(z.object({ queueId: z.number(), userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await assignQueueItem(input.queueId, input.userId);

      await createAuditLog(ctx.user?.id, "assign", "attendance_queue", input.queueId, {
        assignedTo: input.userId,
      });

      return result;
    }),

  // Auto-assign (round-robin or least busy)
  autoAssign: protectedProcedure
    .input(z.object({ queueId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Get available agents (Atendente role)
      const users = await listUsers();
      const agents = users.filter(
        (u: any) => u.role === "Atendente" && u.emailVerified
      );

      if (agents.length === 0) {
        throw new Error("Nenhum atendente disponível");
      }

      // Get current queue assignments to find least busy agent
      const queue = await listAttendanceQueue("assigned");
      const agentLoad = new Map<number, number>();

      agents.forEach((agent: any) => agentLoad.set(agent.id, 0));
      queue.forEach((item: any) => {
        if (item.assignedUserId) {
          const current = agentLoad.get(item.assignedUserId) || 0;
          agentLoad.set(item.assignedUserId, current + 1);
        }
      });

      // Find agent with least load
      let selectedAgent = agents[0];
      let minLoad = agentLoad.get(selectedAgent.id) || 0;

      for (const agent of agents) {
        const load = agentLoad.get(agent.id) || 0;
        if (load < minLoad) {
          minLoad = load;
          selectedAgent = agent;
        }
      }

      // Assign to selected agent
      const result = await assignQueueItem(input.queueId, selectedAgent.id);

      await createAuditLog(ctx.user?.id, "auto_assign", "attendance_queue", input.queueId, {
        assignedTo: selectedAgent.id,
        algorithm: "least_loaded",
      });

      return { ...result, assignedAgent: selectedAgent };
    }),

  // Get available agents for manual assignment
  getAvailableAgents: protectedProcedure.query(async () => {
    const users = await listUsers();
    return users.filter(
      (u: any) => u.role === "Atendente" || u.role === "Supervisor"
    );
  }),

  // Reactivate AI for conversation
  reactivateAI: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await updateConversationStatus(input.conversationId, "active");

      await createAuditLog(ctx.user?.id, "reactivate_ai", "conversation", input.conversationId, {
        reason: "manual_reactivation",
      });

      return result;
    }),

  // Close conversation
  closeConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await updateConversationStatus(input.conversationId, "closed");

      await createAuditLog(ctx.user?.id, "close", "conversation", input.conversationId, {
        reason: input.reason || "manual_close",
      });

      return result;
    }),

  // Get queue stats for supervisor
  getStats: protectedProcedure.query(async () => {
    const all = await listAttendanceQueue();
    const waiting = all.filter((q: any) => q.status === "waiting");
    const assigned = all.filter((q: any) => q.status === "assigned");
    const inProgress = all.filter((q: any) => q.status === "in_progress");

    // Average wait time
    const now = Date.now();
    const waitTimes = waiting.map((q: any) => now - new Date(q.requestedAt).getTime());
    const avgWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    return {
      total: all.length,
      waiting: waiting.length,
      assigned: assigned.length,
      inProgress: inProgress.length,
      avgWaitTimeMs: avgWaitTime,
    };
  }),
});