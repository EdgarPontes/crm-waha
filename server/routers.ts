import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { wahaRouter } from "./routers/waha";
import { wahaConfigRouter } from "./routers/waha-config";
import { crmRouter } from "./routers/crm";
import { conversationsRouter } from "./routers/conversations";
import { whatsappRouter } from "./routers/whatsapp";
import { aiRouter } from "./routers/ai";
import { dashboardRouter } from "./routers/dashboard";
import { authRouter } from "./routers/auth";
import { attendanceQueueRouter } from "./routers/attendance";
import { automationRouter } from "./routers/automation";

export const appRouter = router({
  system: systemRouter,
  waha: wahaRouter,
  wahaConfig: wahaConfigRouter,
  auth: authRouter,

  // CRM Routers
  crm: crmRouter,
  conversations: conversationsRouter,
  whatsapp: whatsappRouter,
  ai: aiRouter,
  dashboard: dashboardRouter,
  attendance: attendanceQueueRouter,
  automation: automationRouter,
});

export type AppRouter = typeof appRouter;