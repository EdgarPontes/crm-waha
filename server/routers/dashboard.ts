import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  listConversations,
  listLeadsByStage,
  getStagesByPipeline,
  getDefaultPipeline,
} from "../db";

interface Stage {
  id: number;
  name: string;
  pipelineId: number;
  order: number;
}

export const dashboardRouter = router({
  metrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      // Get conversations metrics
      const activeConversations = await listConversations("active", 1000, 0);
      const waitingConversations = await listConversations(
        "waiting_human",
        1000,
        0
      );
      const closedConversations = await listConversations("closed", 1000, 0);

      // Get pipeline metrics
      const pipeline = await getDefaultPipeline();
      const stages = pipeline ? await getStagesByPipeline(pipeline.id) : [];

      const leadsByStage: Record<number, number> = {};
      for (const stage of stages) {
        const leads = await listLeadsByStage(stage.id);
        leadsByStage[stage.id] = leads.length;
      }

      // Calculate conversion rate (simplified)
      const totalLeads = Object.values(leadsByStage).reduce((a, b) => a + b, 0);
      const wonStage = stages.find((s: Stage) => s.name === "Ganho");
      const wonLeads = wonStage ? leadsByStage[wonStage.id] || 0 : 0;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      // Calculate average response time (placeholder)
      const avgResponseTime = 45; // minutes

      // Calculate average attendance time (placeholder)
      const avgAttendanceTime = 120; // minutes

      return {
        conversations: {
          active: activeConversations.length,
          waitingHuman: waitingConversations.length,
          closed: closedConversations.length,
          total:
            activeConversations.length +
            waitingConversations.length +
            closedConversations.length,
        },
        leads: {
          total: totalLeads,
          byStage: leadsByStage,
          won: wonLeads,
          lost: stages.find((s: Stage) => s.name === "Perdido")
            ? leadsByStage[
                stages.find((s: Stage) => s.name === "Perdido")!.id
              ] || 0
            : 0,
        },
        metrics: {
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          avgResponseTime,
          avgAttendanceTime,
          leadsCreated: totalLeads,
        },
        stages: stages.map((s: Stage) => ({
          id: s.id,
          name: s.name,
          leadCount: leadsByStage[s.id] || 0,
        })),
      };
    }),

  // Placeholder for more detailed metrics
  leadsMetrics: protectedProcedure.query(async () => {
    return {
      created: 0,
      converted: 0,
      lost: 0,
      inProgress: 0,
    };
  }),

  conversationMetrics: protectedProcedure.query(async () => {
    return {
      total: 0,
      active: 0,
      waitingHuman: 0,
      closed: 0,
      avgResponseTime: 0,
    };
  }),

  aiMetrics: protectedProcedure.query(async () => {
    return {
      messagesProcessed: 0,
      handoffCount: 0,
      avgProcessingTime: 0,
      successRate: 0,
    };
  }),

  agentMetrics: protectedProcedure.query(async () => {
    return {
      totalAgents: 0,
      activeAgents: 0,
      avgAttendanceTime: 0,
      totalAttendances: 0,
    };
  }),
});
