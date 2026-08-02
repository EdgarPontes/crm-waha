import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
  supervisorProcedure,
} from "../_core/trpc";
import {
  listUsers,
  listUsersByRole,
  getUserByIdPublic,
  getUserStats,
  createLocalUser,
  updateUserInfo,
  updateUserRole,
  updateUserPassword,
  setUserEmailVerified,
  deleteUser,
  getUserByEmail,
  createAuditLog,
} from "../db";

const userRoleSchema = z.enum(["Administrador", "Supervisor", "Atendente"]);

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  loginMethod: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  lastSignedIn: true,
};

export const usersRouter = router({
  // ========================================================================
  // LISTAGEM
  // ========================================================================

  list: protectedProcedure
    .input(
      z
        .object({
          role: userRoleSchema.optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const role = input?.role;
      const search = input?.search?.trim().toLowerCase();

      const baseUsers = role ? await listUsersByRole(role) : await listUsers();

      if (!search) {
        return baseUsers;
      }

      return baseUsers.filter((u: { email: string | null; name: string | null }) => {
        const email = (u.email || "").toLowerCase();
        const name = (u.name || "").toLowerCase();
        return email.includes(search) || name.includes(search);
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getUserByIdPublic(input.id);
    }),

  stats: protectedProcedure.query(async () => {
    return getUserStats();
  }),

  // ========================================================================
  // CRIAÇÃO (admin only)
  // ========================================================================

  create: adminProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
        name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").optional(),
        role: userRoleSchema.default("Atendente"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um usuário com este email",
        });
      }

      const created = await createLocalUser(
        input.email,
        input.password,
        input.name,
        input.role
      );

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao criar usuário",
        });
      }

      await createAuditLog(ctx.user?.id, "create", "user", created.id, {
        email: created.email,
        role: created.role,
      });

      return created;
    }),

  // ========================================================================
  // ATUALIZAÇÃO
  // ========================================================================

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const target = await getUserByIdPublic(input.id);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      if (input.email && input.email !== target.email) {
        const existing = await getUserByEmail(input.email);
        if (existing && existing.id !== input.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email já está em uso por outro usuário",
          });
        }
      }

      const { id, ...data } = input;
      await updateUserInfo(id, data);

      await createAuditLog(ctx.user?.id, "update", "user", id, {
        before: { name: target.name, email: target.email },
        after: data,
      });

      return { success: true, id };
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number(),
        role: userRoleSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user?.id && input.role !== "Administrador") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode remover seu próprio papel de administrador",
        });
      }

      const target = await getUserByIdPublic(input.id);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      await updateUserRole(input.id, input.role);

      await createAuditLog(ctx.user?.id, "update", "user", input.id, {
        field: "role",
        before: target.role,
        after: input.role,
      });

      return { success: true, id: input.id, role: input.role };
    }),

  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number(),
        newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const target = await getUserByIdPublic(input.id);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      const updated = await updateUserPassword(input.id, input.newPassword);

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao redefinir senha",
        });
      }

      await createAuditLog(
        ctx.user?.id,
        "update",
        "user",
        input.id,
        { field: "password", action: "reset" }
      );

      return { success: true };
    }),

  verifyEmail: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const target = await getUserByIdPublic(input.id);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      await setUserEmailVerified(input.id);

      await createAuditLog(
        ctx.user?.id,
        "update",
        "user",
        input.id,
        { field: "emailVerified", value: true }
      );

      return { success: true };
    }),

  // ========================================================================
  // EXCLUSÃO (admin only)
  // ========================================================================

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user?.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode excluir seu próprio usuário",
        });
      }

      const target = await getUserByIdPublic(input.id);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      await deleteUser(input.id);

      await createAuditLog(ctx.user?.id, "delete", "user", input.id, {
        email: target.email,
        role: target.role,
      });

      return { success: true, id: input.id };
    }),

  // ========================================================================
  // PERMISSÕES / VALIDAÇÃO
  // ========================================================================

  checkPermission: protectedProcedure
    .input(
      z.object({
        requiredRole: userRoleSchema,
      })
    )
    .query(async ({ input, ctx }) => {
      const roleHierarchy: Record<
        "Administrador" | "Supervisor" | "Atendente",
        number
      > = {
        Atendente: 1,
        Supervisor: 2,
        Administrador: 3,
      };

      const userLevel = ctx.user
        ? roleHierarchy[ctx.user.role as keyof typeof roleHierarchy] || 0
        : 0;
      const requiredLevel = roleHierarchy[input.requiredRole];

      return {
        allowed: userLevel >= requiredLevel,
        userRole: ctx.user?.role ?? null,
        requiredRole: input.requiredRole,
      };
    }),

  // ========================================================================
  // SUPERVISOR: pode listar usuários para distribuição, sem operações destrutivas
  // ========================================================================

  listForAssignment: supervisorProcedure.query(async () => {
    return listUsers();
  }),
});

export type UsersRouter = typeof usersRouter;
