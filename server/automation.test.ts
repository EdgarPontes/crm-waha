import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "user-1",
    email: "admin@example.com",
    passwordHash: "hashed",
    name: "Admin User",
    loginMethod: "local",
    role: "Administrador",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeContext(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function makeAutomation(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Auto-message",
    trigger: "message_contains",
    triggerValue: "hello",
    action: "send_message",
    actionValue: { message: "Hi there!" } as Record<string, unknown>,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

const mockAutomations: ReturnType<typeof makeAutomation>[] = [];

vi.mock("./db", async () => {
  const actual =
    await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    createAutomation: vi.fn(async (data: Record<string, unknown>) => {
      const automation = {
        id: mockAutomations.length + 1,
        name: data.name as string,
        trigger: data.trigger as string,
        triggerValue: data.triggerValue as string,
        action: data.action as string,
        actionValue: data.actionValue as Record<string, unknown> | undefined,
        isActive: (data.isActive as boolean) ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAutomations.push(automation);
      return automation;
    }),
    listAutomations: vi.fn(async () => {
      return [...mockAutomations].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }),
    listActiveAutomations: vi.fn(async () => {
      return mockAutomations.filter((a) => a.isActive);
    }),
    getAutomationById: vi.fn(async (id: number) => {
      return mockAutomations.find((a) => a.id === id) ?? null;
    }),
    updateAutomation: vi.fn(
      async (id: number, data: Record<string, unknown>) => {
        const idx = mockAutomations.findIndex((a) => a.id === id);
        if (idx >= 0) {
          if (data.name !== undefined)
            mockAutomations[idx].name = data.name as string;
          if (data.trigger !== undefined)
            mockAutomations[idx].trigger = data.trigger as string;
          if (data.triggerValue !== undefined)
            mockAutomations[idx].triggerValue = data.triggerValue as string;
          if (data.action !== undefined)
            mockAutomations[idx].action = data.action as string;
          if (data.actionValue !== undefined)
            mockAutomations[idx].actionValue =
              data.actionValue as Record<string, unknown>;
          if (data.isActive !== undefined)
            mockAutomations[idx].isActive = data.isActive as boolean;
          mockAutomations[idx].updatedAt = new Date();
          return mockAutomations[idx];
        }
        return null;
      }
    ),
    deleteAutomation: vi.fn(async (id: number) => {
      const idx = mockAutomations.findIndex((a) => a.id === id);
      if (idx >= 0) mockAutomations.splice(idx, 1);
      return null;
    }),
    createAuditLog: vi.fn(async () => null),
  };
});

beforeEach(() => {
  mockAutomations.length = 0;
  mockAutomations.push(
    makeAutomation({
      id: 1,
      name: "Auto reply hello",
      trigger: "message_contains",
      triggerValue: "hello",
      action: "send_message",
      actionValue: { message: "Hello! How can I help?" },
    }),
    makeAutomation({
      id: 2,
      name: "Move after yes",
      trigger: "response_yes",
      triggerValue: "yes",
      action: "move_stage",
      actionValue: { stage: "qualified" },
    }),
    makeAutomation({
      id: 3,
      name: "Inactive tagger",
      trigger: "inactivity_hours",
      triggerValue: "24",
      action: "add_tag",
      actionValue: { tag: "inactive" },
      isActive: false,
    })
  );
});

describe("automation.create", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.create({
        name: "Test",
        trigger: "message_contains",
        triggerValue: "test",
        action: "send_message",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita supervisor (apenas admin)", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.create({
        name: "Test",
        trigger: "message_contains",
        triggerValue: "test",
        action: "send_message",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita atendente (apenas admin)", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.create({
        name: "Test",
        trigger: "message_contains",
        triggerValue: "test",
        action: "send_message",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("admin cria automação com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.create({
      name: "Tag VIP",
      trigger: "message_contains",
      triggerValue: "VIP",
      action: "add_tag",
      actionValue: { tag: "vip" },
    });

    expect(result.name).toBe("Tag VIP");
    expect(result.trigger).toBe("message_contains");
    expect(result.action).toBe("add_tag");
    expect(result.isActive).toBe(true);
    expect(mockAutomations).toHaveLength(4);
  });

  it("admin cria automação inativa", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.create({
      name: "Inactive rule",
      trigger: "inactivity_hours",
      triggerValue: "12",
      action: "move_stage",
      actionValue: { stage: "archived" },
      isActive: false,
    });

    expect(result.isActive).toBe(false);
  });

  it("rejeita nome vazio (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.create({
        name: "",
        trigger: "message_contains",
        triggerValue: "test",
        action: "send_message",
      })
    ).rejects.toThrow();
  });

  it("rejeita triggerValue vazio (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.create({
        name: "Test",
        trigger: "message_contains",
        triggerValue: "",
        action: "send_message",
      })
    ).rejects.toThrow();
  });
});

describe("automation.list", () => {
  it("lista todas as automações para usuário autenticado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.list({});

    expect(result).toHaveLength(3);
  });

  it("filtra apenas automações ativas com activeOnly=true", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.list({ activeOnly: true });

    expect(result).toHaveLength(2);
    expect(result.every((a: { isActive: boolean }) => a.isActive)).toBe(true);
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.automation.list({})).rejects.toThrow(TRPCError);
  });
});

describe("automation.get", () => {
  it("retorna automação por id", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.get({ id: 1 });

    expect(result.name).toBe("Auto reply hello");
    expect(result.trigger).toBe("message_contains");
  });

  it("retorna null para id inexistente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.get({ id: 999 });

    expect(result).toBeNull();
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.automation.get({ id: 1 })).rejects.toThrow(TRPCError);
  });
});

describe("automation.update", () => {
  it("admin atualiza nome da automação", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.update({
      id: 1,
      name: "Updated name",
    });

    expect(result.name).toBe("Updated name");
    expect(result.trigger).toBe("message_contains");
  });

  it("admin atualiza múltiplos campos", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.update({
      id: 2,
      name: "Changed",
      triggerValue: "no",
      isActive: false,
    });

    expect(result.name).toBe("Changed");
    expect(result.triggerValue).toBe("no");
    expect(result.isActive).toBe(false);
  });

  it("rejeita supervisor (apenas admin)", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.update({ id: 1, name: "Hack" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita atendente (apenas admin)", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.update({ id: 1, name: "Hack" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.automation.update({ id: 1, name: "Hack" })
    ).rejects.toThrow(TRPCError);
  });

  it("retorna null ao tentar atualizar id inexistente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.update({
      id: 999,
      name: "Ghost",
    });

    expect(result).toBeNull();
  });
});

describe("automation.delete", () => {
  it("admin exclui automação com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.delete({ id: 3 });

    expect(result).toEqual({ success: true, id: 3 });
    expect(mockAutomations).toHaveLength(2);
  });

  it("rejeita supervisor (apenas admin)", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.automation.delete({ id: 1 })).rejects.toThrow(TRPCError);
  });

  it("rejeita atendente (apenas admin)", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.automation.delete({ id: 1 })).rejects.toThrow(TRPCError);
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.automation.delete({ id: 1 })).rejects.toThrow(TRPCError);
  });
});
