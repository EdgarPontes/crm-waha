import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { wahaRouter } from "./routers/waha";
import { crmRouter } from "./routers/crm";
import { conversationsRouter } from "./routers/conversations";
import { whatsappRouter } from "./routers/whatsapp";
import { aiRouter } from "./routers/ai";
import { dashboardRouter } from "./routers/dashboard";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  system: systemRouter,
  waha: wahaRouter,
  auth: authRouter,

  // CRM Routers
  crm: crmRouter,
  conversations: conversationsRouter,
  whatsapp: whatsappRouter,
  ai: aiRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
