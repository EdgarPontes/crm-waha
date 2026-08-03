import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "user-1",
    email: "supervisor@example.com",
    passwordHash: "hashed",
    name: "Supervisor User",
    loginMethod: "local",
    role: "Supervisor",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeAttendenteUser(): AuthenticatedUser {
  return makeUser({ id: 2, email: "agent@example.com", name: "Agent User", role: "Atendente" });
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

const mockAuditLogs = [
  {
    id: 1,
    userId: 1,
    userName: "Supervisor User",
    userEmail: "supervisor@example.com",
    action: "login",
    entityType: "user",
    entityId: 1,
    changes: null,
    createdAt: new Date("2025-06-01T10:00:00Z"),
  },
  {
    id: 2,
    userId: 1,
    userName: "Supervisor User",
    userEmail: "supervisor@example.com",
    action: "create",
    entityType: "lead",
    entityId: 42,
    changes: { stageId: 1 },
    createdAt: new Date("2025-06-01T11:00:00Z"),
  },
  {
    id: 3,
    userId: 2,
    userName: "Agent User",
    userEmail: "agent@example.com",
    action: "transfer_conversation",
    entityType: "conversation",
    entityId: 10,
    changes: { assignedTo: 2 },
    createdAt: new Date("2025-06-01T12:00:00Z"),
  },
  {
    id: 4,
    userId: 1,
    userName: "Supervisor User",
    userEmail: "supervisor@example.com",
    action: "logout",
    entityType: "user",
    entityId: 1,
    changes: null,
    createdAt: new Date("2025-06-01T18:00:00Z"),
  },
];

const mockUsers = [
  { id: 1, name: "Supervisor User", email: "supervisor@example.com" },
  { id: 2, name: "Agent User", email: "agent@example.com" },
];

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    listAuditLogs: vi.fn(
      async (
        _limit: number,
        _offset: number,
        _filters?: unknown
      ) => {
        let logs = [...mockAuditLogs];
        const f = _filters as Record<string, unknown> | undefined;
        if (f?.userId) logs = logs.filter((l) => l.userId === f.userId);
        if (f?.action) logs = logs.filter((l) => l.action === f.action);
        if (f?.entityType) logs = logs.filter((l) => l.entityType === f.entityType);
        if (f?.startDate) logs = logs.filter((l) => new Date(l.createdAt) >= (f.startDate as Date));
        if (f?.endDate) logs = logs.filter((l) => new Date(l.createdAt) <= (f.endDate as Date));

        const start = _offset ?? 0;
        const end = start + (_limit ?? 50);
        return logs.slice(start, end);
      }
    ),
    countAuditLogs: vi.fn(async () => mockAuditLogs.length),
    listUsers: vi.fn(async () => mockUsers),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("audit.list", () => {
  it("deve listar logs de auditoria para supervisor", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({ limit: 50, offset: 0 });
    expect(result.logs).toHaveLength(4);
    expect(result.total).toBe(4);
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it("cada log deve ter os campos esperados", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({ limit: 50, offset: 0 });
    for (const log of result.logs) {
      expect(log).toHaveProperty("id");
      expect(log).toHaveProperty("userId");
      expect(log).toHaveProperty("userName");
      expect(log).toHaveProperty("userEmail");
      expect(log).toHaveProperty("action");
      expect(log).toHaveProperty("entityType");
      expect(log).toHaveProperty("entityId");
      expect(log).toHaveProperty("changes");
      expect(log).toHaveProperty("createdAt");
    }
  });

  it("deve filtrar por ação", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({ limit: 50, offset: 0, action: "login" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe("login");
  });

  it("deve filtrar por tipo de entidade", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({ limit: 50, offset: 0, entityType: "lead" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].entityType).toBe("lead");
  });

  it("deve filtrar por usuário", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({ limit: 50, offset: 0, userId: 2 });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].userId).toBe(2);
  });

  it("deve filtrar por data de início", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({
      limit: 50,
      offset: 0,
      startDate: new Date("2025-06-01T12:00:00Z"),
    });
    expect(result.logs.length).toBeGreaterThanOrEqual(1);
  });

  it("deve filtrar por data de fim", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({
      limit: 50,
      offset: 0,
      endDate: new Date("2025-06-01T10:30:00Z"),
    });
    expect(result.logs.length).toBeLessThan(4);
  });

  it("deve rejeitar usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.list({ limit: 50, offset: 0 })).rejects.toThrow();
  });

  it("deve rejeitar atendentes (sem permissão)", async () => {
    const ctx = makeContext(makeAttendenteUser());
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.list({ limit: 50, offset: 0 })).rejects.toThrow();
  });

  it("deve aceitar administradores", async () => {
    const ctx = makeContext(makeUser({ role: "Administrador" }));
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.list({ limit: 50, offset: 0 });
    expect(result.logs).toHaveLength(4);
  });

  it("deve suportar paginação", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const page1 = await caller.audit.list({ limit: 2, offset: 0 });
    const page2 = await caller.audit.list({ limit: 2, offset: 2 });

    expect(page1.logs).toHaveLength(2);
    expect(page2.logs).toHaveLength(2);
    expect(page1.logs[0].id).not.toBe(page2.logs[0].id);
  });

  it("deve validar limite máximo", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.list({ limit: 300, offset: 0 })).rejects.toThrow();
  });
});

describe("audit.filters", () => {
  it("deve retornar opções de filtro para supervisor", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.filters();
    expect(result).toHaveProperty("actions");
    expect(result).toHaveProperty("entityTypes");
    expect(result).toHaveProperty("users");
    expect(Array.isArray(result.actions)).toBe(true);
    expect(Array.isArray(result.entityTypes)).toBe(true);
    expect(Array.isArray(result.users)).toBe(true);
    expect(result.users).toHaveLength(2);
  });

  it("deve rejeitar atendentes", async () => {
    const ctx = makeContext(makeAttendenteUser());
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.filters()).rejects.toThrow();
  });
});
