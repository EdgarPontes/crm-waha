import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  getActiveWAHAConfiguration,
  getWAHAConfigurationById,
  listWAHAConfigurations,
  createWAHAConfiguration,
  updateWAHAConfiguration,
  deleteWAHAConfiguration,
  testWAHAConnection,
} from "../db";

export const wahaConfigRouter = router({
  list: protectedProcedure.query(async () => {
    return await listWAHAConfigurations();
  }),

  getActive: protectedProcedure.query(async () => {
    return await getActiveWAHAConfiguration();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getWAHAConfigurationById(input.id);
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        baseUrl: z.string().url(),
        apiKey: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const config = await createWAHAConfiguration(input);

      if (!config) {
        throw new Error("Failed to create WAHA configuration");
      }

      return config;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        baseUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await updateWAHAConfiguration(id, data);

      if (!result) {
        throw new Error("Failed to update WAHA configuration");
      }

      return result;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await deleteWAHAConfiguration(input.id);
    }),

  testConnection: protectedProcedure
    .input(
      z.object({
        baseUrl: z.string().url(),
        apiKey: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await testWAHAConnection(input.baseUrl, input.apiKey);
    }),
});