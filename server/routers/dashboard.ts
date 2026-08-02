import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getDashboardMetrics,
  getAverageResponseTime,
  getAverageAttendanceTime,
  getAgentsMetrics,
  getAiMetrics,
  getSalesByPeriod,
  getConversationsByPeriod,
  getLeadsByPeriod,
} from "../db";

export const dashboardRouter = router({
  metrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const [baseMetrics, avgResponseTime, avgAttendanceTime] = await Promise.all([
        getDashboardMetrics(input.startDate, input.endDate),
        getAverageResponseTime(input.startDate, input.endDate),
        getAverageAttendanceTime(input.startDate, input.endDate),
      ]);

      return {
        ...baseMetrics,
        avgResponseTime,
        avgAttendanceTime,
      };
    }),

  leadsMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const baseMetrics = await getDashboardMetrics(input.startDate, input.endDate);
      return {
        created: baseMetrics.leads.total,
        won: baseMetrics.leads.won,
        lost: baseMetrics.leads.lost,
        inProgress: baseMetrics.leads.total - baseMetrics.leads.won - baseMetrics.leads.lost,
      };
    }),

  conversationMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const baseMetrics = await getDashboardMetrics(input.startDate, input.endDate);
      const avgResponseTime = await getAverageResponseTime(input.startDate, input.endDate);
      return {
        total: baseMetrics.conversations.total,
        active: baseMetrics.conversations.active,
        waitingHuman: baseMetrics.conversations.waitingHuman,
        closed: baseMetrics.conversations.closed,
        avgResponseTime,
      };
    }),

  aiMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return getAiMetrics(input.startDate, input.endDate);
    }),

  agentMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const metrics = await getAgentsMetrics(input.startDate, input.endDate);
      const activeAgents = metrics.filter(m => m.totalAttendances > 0 || m.totalLeads > 0).length;
      const totalAttendances = metrics.reduce((sum, m) => sum + m.totalAttendances, 0);
      const attendanceTimes = metrics.filter(m => m.avgAttendanceTime > 0).map(m => m.avgAttendanceTime);
      const avgAttendanceTime =
        attendanceTimes.length > 0
          ? Math.round(attendanceTimes.reduce((a, b) => a + b, 0) / attendanceTimes.length)
          : 0;

      return {
        agents: metrics,
        totalAgents: metrics.length,
        activeAgents,
        avgAttendanceTime,
        totalAttendances,
      };
    }),

  salesByPeriod: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ input }) => {
      return getSalesByPeriod(input.startDate, input.endDate, input.groupBy);
    }),

  conversationsByPeriod: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ input }) => {
      return getConversationsByPeriod(input.startDate, input.endDate, input.groupBy);
    }),

  leadsByPeriod: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ input }) => {
      return getLeadsByPeriod(input.startDate, input.endDate, input.groupBy);
    }),
});
