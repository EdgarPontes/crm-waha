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

const mockState: {
  queue: Array<{
    id: number;
    conversationId: number;
    contactId: number;
    priority: number;
    status: string;
    assignedUserId: number | null;
    assignedAt: Date | null;
    requestedAt: Date;
    startedAt: Date | null;
    closedAt: Date | null;
    updatedAt: Date;
  }>;
  agents: Array<{
    id: number;
    email: string;
    name: string | null;
    loginMethod: string | null;
    role: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastSignedIn: Date;
  }>;
} = {
  queue: [],
  agents: [],
};

let nextId = 1;

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    addToAttendanceQueue: vi.fn(
      async (conversationId: number, contactId: number, priority = 0) => {
        const existing = mockState.queue.find(
          (q) => q.conversationId === conversationId
        );
        if (existing) return existing;

        const item = {
          id: nextId++,
          conversationId,
          contactId,
          priority,
          status: "waiting",
          assignedUserId: null,
          assignedAt: null,
          requestedAt: new Date(),
          startedAt: null,
          closedAt: null,
          updatedAt: new Date(),
        };
        mockState.queue.push(item);
        return item;
      }
    ),
    getAttendanceQueueItem: vi.fn(async (conversationId: number) => {
      return (
        mockState.queue.find((q) => q.conversationId === conversationId) ??
        null
      );
    }),
    listAttendanceQueue: vi.fn(
      async (
        status?: string,
        assignedUserId?: number,
        limit = 50,
        offset = 0
      ) => {
        let filtered = [...mockState.queue];

        if (status) {
          filtered = filtered.filter((q) => q.status === status);
        }
        if (assignedUserId !== undefined) {
          filtered = filtered.filter(
            (q) => q.assignedUserId === assignedUserId
          );
        }

        filtered.sort(
          (a, b) =>
            b.priority - a.priority ||
            a.requestedAt.getTime() - b.requestedAt.getTime()
        );

        return filtered.slice(offset, offset + limit);
      }
    ),
    assignQueueItem: vi.fn(async (queueId: number, userId: number) => {
      const item = mockState.queue.find((q) => q.id === queueId);
      if (item) {
        item.status = "assigned";
        item.assignedUserId = userId;
        item.assignedAt = new Date();
        item.updatedAt = new Date();
      }
      return item ?? null;
    }),
    getQueueStats: vi.fn(async () => {
      const result = { waiting: 0, assigned: 0, inProgress: 0, closed: 0 };
      for (const q of mockState.queue) {
        if (q.status in result) {
          result[q.status as keyof typeof result]++;
        }
      }
      return result;
    }),
    updateConversationStatus: vi.fn(
      async (_conversationId: number, _status: string) => {
        return null;
      }
    ),
    listUsers: vi.fn(async () => mockState.agents),
    createAuditLog: vi.fn(async () => null),
  };
});

beforeEach(() => {
  nextId = 1;
  mockState.queue = [];
  mockState.agents = [
    {
      id: 10,
      email: "agent1@example.com",
      name: "Agent One",
      loginMethod: "local",
      role: "Atendente",
      emailVerified: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      lastSignedIn: new Date("2024-06-01"),
    },
    {
      id: 11,
      email: "agent2@example.com",
      name: "Agent Two",
      loginMethod: "local",
      role: "Atendente",
      emailVerified: true,
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-01"),
      lastSignedIn: new Date("2024-06-02"),
    },
    {
      id: 12,
      email: "supervisor@example.com",
      name: "Supervisor User",
      loginMethod: "local",
      role: "Supervisor",
      emailVerified: true,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
      lastSignedIn: new Date("2024-06-03"),
    },
    {
      id: 13,
      email: "unverified@example.com",
      name: "Unverified Agent",
      loginMethod: "local",
      role: "Atendente",
      emailVerified: false,
      createdAt: new Date("2024-04-01"),
      updatedAt: new Date("2024-04-01"),
      lastSignedIn: new Date("2024-06-04"),
    },
  ];
});

describe("attendance.enqueue", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.enqueue({
        conversationId: 1,
        contactId: 5,
        priority: 1,
      })
    ).rejects.toThrow(TRPCError);
  });

  it("adiciona conversa à fila com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
      priority: 2,
    });

    expect(result).not.toBeNull();
    expect(result.conversationId).toBe(100);
    expect(result.contactId).toBe(200);
    expect(result.priority).toBe(2);
    expect(result.status).toBe("waiting");
    expect(mockState.queue).toHaveLength(1);
  });

  it("define prioridade 0 por padrão quando não informada", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.enqueue({
      conversationId: 101,
      contactId: 201,
    });

    expect(result.priority).toBe(0);
  });

  it("retorna item existente se conversa já estiver na fila", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const first = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
      priority: 1,
    });
    const second = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
      priority: 3,
    });

    expect(second.id).toBe(first.id);
    expect(mockState.queue).toHaveLength(1);
  });

  it("rejeita quando falta conversationId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.enqueue as any)({
        contactId: 200,
      })
    ).rejects.toThrow();
  });

  it("rejeita quando falta contactId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.enqueue as any)({
        conversationId: 100,
      })
    ).rejects.toThrow();
  });
});

describe("attendance.getByConversation", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.getByConversation({ conversationId: 1 })
    ).rejects.toThrow(TRPCError);
  });

  it("retorna item da fila pelo conversationId", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });

    const result = await caller.attendance.getByConversation({
      conversationId: 100,
    });

    expect(result).not.toBeNull();
    expect(result?.conversationId).toBe(100);
    expect(result?.contactId).toBe(200);
  });

  it("retorna null quando conversa não está na fila", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.getByConversation({
      conversationId: 999,
    });

    expect(result).toBeNull();
  });

  it("rejeita quando falta conversationId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.getByConversation as any)({})
    ).rejects.toThrow();
  });
});

describe("attendance.list", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.attendance.list({})).rejects.toThrow(TRPCError);
  });

  it("lista todos os itens da fila", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });
    await caller.attendance.enqueue({
      conversationId: 101,
      contactId: 201,
    });

    const result = await caller.attendance.list({});

    expect(result).toHaveLength(2);
  });

  it("filtra por status", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const item = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });
    await caller.attendance.enqueue({
      conversationId: 101,
      contactId: 201,
    });
    await caller.attendance.assign({ queueId: item.id, userId: 10 });

    const waiting = await caller.attendance.list({ status: "waiting" });
    const assigned = await caller.attendance.list({ status: "assigned" });

    expect(waiting).toHaveLength(1);
    expect(assigned).toHaveLength(1);
    expect(assigned[0]?.assignedUserId).toBe(10);
  });

  it("filtra por assignedUserId", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const item1 = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });
    const item2 = await caller.attendance.enqueue({
      conversationId: 101,
      contactId: 201,
    });
    await caller.attendance.assign({ queueId: item1.id, userId: 10 });
    await caller.attendance.assign({ queueId: item2.id, userId: 11 });

    const agent10 = await caller.attendance.list({ assignedUserId: 10 });

    expect(agent10).toHaveLength(1);
    expect(agent10[0]?.assignedUserId).toBe(10);
  });

  it("aplica valores padrão de limite e offset", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    for (let i = 0; i < 10; i++) {
      await caller.attendance.enqueue({
        conversationId: 100 + i,
        contactId: 200 + i,
      });
    }

    const result = await caller.attendance.list({});

    expect(result.length).toBeLessThanOrEqual(50);
  });
});

describe("attendance.assign", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.assign({ queueId: 1, userId: 10 })
    ).rejects.toThrow(TRPCError);
  });

  it("atribui item da fila a um atendente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const item = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });
    const result = await caller.attendance.assign({
      queueId: item.id,
      userId: 10,
    });

    expect(result).not.toBeNull();
    expect(result.status).toBe("assigned");
    expect(result.assignedUserId).toBe(10);
  });

  it("rejeita quando falta queueId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.assign as any)({ userId: 10 })
    ).rejects.toThrow();
  });

  it("rejeita quando falta userId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.assign as any)({ queueId: 1 })
    ).rejects.toThrow();
  });
});

describe("attendance.autoAssign", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.autoAssign({ queueId: 1 })
    ).rejects.toThrow(TRPCError);
  });

  it("atribui automaticamente ao atendente com menos carga", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const item1 = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });
    const item2 = await caller.attendance.enqueue({
      conversationId: 101,
      contactId: 201,
    });
    const item3 = await caller.attendance.enqueue({
      conversationId: 102,
      contactId: 202,
    });

    // Agent 10 gets 2 items, agent 11 gets 0
    await caller.attendance.assign({ queueId: item1.id, userId: 10 });
    await caller.attendance.assign({ queueId: item2.id, userId: 10 });

    // autoAssign item3 should pick agent 11 (least loaded)
    const result = await caller.attendance.autoAssign({
      queueId: item3.id,
    });

    expect(result).not.toBeNull();
    expect(result.assignedAgent).toBeDefined();
    expect(result.assignedAgent.id).toBe(11);
  });

  it("lança erro quando não há atendentes disponíveis", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    mockState.agents = [];

    const item = await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });

    await expect(
      caller.attendance.autoAssign({ queueId: item.id })
    ).rejects.toThrow(/atendente/i);
  });

  it("rejeita quando falta queueId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.autoAssign as any)({})
    ).rejects.toThrow();
  });
});

describe("attendance.getAvailableAgents", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.getAvailableAgents()
    ).rejects.toThrow(TRPCError);
  });

  it("retorna apenas Atendentes e Supervisores", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.getAvailableAgents();

    expect(result).toHaveLength(4);
    const roles = result.map((a: any) => a.role);
    expect(roles.every((r: string) => r === "Atendente" || r === "Supervisor")).toBe(true);
  });
});

describe("attendance.reactivateAI", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.reactivateAI({ conversationId: 100 })
    ).rejects.toThrow(TRPCError);
  });

  it("reativa IA para conversa com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.reactivateAI({
      conversationId: 100,
    });

    expect(result).toBeNull();
  });

  it("rejeita quando falta conversationId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.reactivateAI as any)({})
    ).rejects.toThrow();
  });
});

describe("attendance.closeConversation", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.closeConversation({ conversationId: 100 })
    ).rejects.toThrow(TRPCError);
  });

  it("fecha conversa com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.closeConversation({
      conversationId: 100,
    });

    expect(result).toBeNull();
  });

  it("fecha conversa com motivo informado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.closeConversation({
      conversationId: 101,
      reason: "conversa_encerrada",
    });

    expect(result).toBeNull();
  });

  it("rejeita quando falta conversationId (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.attendance.closeConversation as any)({ reason: "motivo" })
    ).rejects.toThrow();
  });
});

describe("attendance.getStats", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.attendance.getStats()
    ).rejects.toThrow(TRPCError);
  });

  it("retorna estatísticas da fila vazia com zeros", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.attendance.getStats();

    expect(result).toEqual({
      total: 0,
      waiting: 0,
      assigned: 0,
      inProgress: 0,
      avgWaitTimeMs: 0,
    });
  });

  it("retorna estatísticas com itens na fila", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.attendance.enqueue({
      conversationId: 100,
      contactId: 200,
    });
    await caller.attendance.enqueue({
      conversationId: 101,
      contactId: 201,
    });
    const item = await caller.attendance.enqueue({
      conversationId: 102,
      contactId: 202,
    });
    await caller.attendance.assign({ queueId: item.id, userId: 10 });

    const result = await caller.attendance.getStats();

    expect(result.total).toBe(3);
    expect(result.waiting).toBe(2);
    expect(result.assigned).toBe(1);
    expect(result.inProgress).toBe(0);
    expect(result.avgWaitTimeMs).toBeGreaterThanOrEqual(0);
  });
});
