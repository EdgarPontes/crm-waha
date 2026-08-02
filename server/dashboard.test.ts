import { describe, expect, it, vi, beforeEach } from "vitest";
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

const mockDashboardMetrics = {
  conversations: { active: 0, waitingHuman: 0, closed: 0, total: 0 },
  leads: { total: 0, won: 0, lost: 0, conversionRate: 0 },
  avgResponseTime: 0,
  avgAttendanceTime: 0,
};

const mockAgentMetrics = [
  { userId: 1, name: "Agent 1", email: "agent1@test.com", totalLeads: 5, wonLeads: 2, totalAttendances: 3, avgAttendanceTime: 10 },
  { userId: 2, name: "Agent 2", email: "agent2@test.com", totalLeads: 3, wonLeads: 1, totalAttendances: 5, avgAttendanceTime: 15 },
  { userId: 3, name: "Agent 3", email: "agent3@test.com", totalLeads: 0, wonLeads: 0, totalAttendances: 0, avgAttendanceTime: 0 },
];

const mockAiMetrics = {
  messagesProcessed: 10,
  handoffCount: 2,
  activeConversations: 3,
  aiConversationsTotal: 5,
};

const mockSalesByPeriod = [
  { period: "2025-01-01", created: 5, won: 1, lost: 0 },
  { period: "2025-01-02", created: 3, won: 2, lost: 1 },
];

const mockConversationsByPeriod = [
  { period: "2025-01-01", count: 4 },
  { period: "2025-01-02", count: 6 },
];

const mockLeadsByPeriod = [
  { period: "2025-01-01", count: 5 },
  { period: "2025-01-02", count: 3 },
];

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    getDashboardMetrics: vi.fn(async () => mockDashboardMetrics),
    getAverageResponseTime: vi.fn(async () => 5),
    getAverageAttendanceTime: vi.fn(async () => 15),
    getAgentsMetrics: vi.fn(async () => mockAgentMetrics),
    getAiMetrics: vi.fn(async () => mockAiMetrics),
    getSalesByPeriod: vi.fn(async () => mockSalesByPeriod),
    getConversationsByPeriod: vi.fn(async () => mockConversationsByPeriod),
    getLeadsByPeriod: vi.fn(async () => mockLeadsByPeriod),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dashboard.metrics", () => {
  it("deve retornar métricas do dashboard para usuário autenticado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.metrics({});

    expect(result).toHaveProperty("conversations");
    expect(result).toHaveProperty("leads");
    expect(result).toHaveProperty("avgResponseTime");
    expect(result).toHaveProperty("avgAttendanceTime");
    expect(result.conversations).toHaveProperty("active");
    expect(result.conversations).toHaveProperty("waitingHuman");
    expect(result.conversations).toHaveProperty("closed");
    expect(result.conversations).toHaveProperty("total");
    expect(result.leads).toHaveProperty("total");
    expect(result.leads).toHaveProperty("won");
    expect(result.leads).toHaveProperty("lost");
    expect(result.leads).toHaveProperty("conversionRate");
  });

  it("deve aceitar filtro por período (startDate e endDate)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");

    const result = await caller.dashboard.metrics({ startDate, endDate });
    expect(result).toBeDefined();
    expect(result.avgResponseTime).toBe(5);
    expect(result.avgAttendanceTime).toBe(15);
  });

  it("deve rejeitar usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.dashboard.metrics({})).rejects.toThrow();
  });
});

describe("dashboard.leadsMetrics", () => {
  it("deve retornar métricas de leads com campos corretos", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.leadsMetrics({});
    expect(result).toHaveProperty("created");
    expect(result).toHaveProperty("won");
    expect(result).toHaveProperty("lost");
    expect(result).toHaveProperty("inProgress");
    expect(result.inProgress).toBe(result.created - result.won - result.lost);
  });
});

describe("dashboard.conversationMetrics", () => {
  it("deve retornar métricas de conversas com campos corretos", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.conversationMetrics({});
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("active");
    expect(result).toHaveProperty("waitingHuman");
    expect(result).toHaveProperty("closed");
    expect(result).toHaveProperty("avgResponseTime");
    expect(result.avgResponseTime).toBe(5);
  });
});

describe("dashboard.aiMetrics", () => {
  it("deve retornar métricas de IA com campos corretos", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.aiMetrics({});
    expect(result).toHaveProperty("messagesProcessed");
    expect(result).toHaveProperty("handoffCount");
    expect(result).toHaveProperty("activeConversations");
    expect(result).toHaveProperty("aiConversationsTotal");
    expect(result.messagesProcessed).toBe(10);
    expect(result.handoffCount).toBe(2);
  });

  it("deve aceitar filtro por período", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.aiMetrics({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    });
    expect(result).toBeDefined();
  });
});

describe("dashboard.agentMetrics", () => {
  it("deve retornar métricas de atendentes com campos corretos", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.agentMetrics({});
    expect(result).toHaveProperty("agents");
    expect(result).toHaveProperty("totalAgents");
    expect(result).toHaveProperty("activeAgents");
    expect(result).toHaveProperty("avgAttendanceTime");
    expect(result).toHaveProperty("totalAttendances");
    expect(result.totalAgents).toBe(3);
    expect(result.activeAgents).toBe(2);
    expect(result.totalAttendances).toBe(8);
  });

  it("cada agente deve ter campos obrigatórios", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.agentMetrics({});
    for (const agent of result.agents) {
      expect(agent).toHaveProperty("userId");
      expect(agent).toHaveProperty("name");
      expect(agent).toHaveProperty("email");
      expect(agent).toHaveProperty("totalLeads");
      expect(agent).toHaveProperty("wonLeads");
      expect(agent).toHaveProperty("totalAttendances");
      expect(agent).toHaveProperty("avgAttendanceTime");
    }
  });

  it("deve aceitar filtro por período", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.agentMetrics({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    });
    expect(result).toBeDefined();
  });
});

describe("dashboard.salesByPeriod", () => {
  it("deve retornar vendas por período", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.salesByPeriod({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
      groupBy: "day",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("period");
    expect(result[0]).toHaveProperty("created");
    expect(result[0]).toHaveProperty("won");
    expect(result[0]).toHaveProperty("lost");
  });

  it("deve aceitar groupBy 'month'", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.salesByPeriod({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      groupBy: "month",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("deve aceitar groupBy 'week'", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.salesByPeriod({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
      groupBy: "week",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("dashboard.conversationsByPeriod", () => {
  it("deve retornar conversas por período", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.conversationsByPeriod({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
      groupBy: "day",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("period");
    expect(result[0]).toHaveProperty("count");
  });
});

describe("dashboard.leadsByPeriod", () => {
  it("deve retornar leads por período", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.leadsByPeriod({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
      groupBy: "day",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("period");
    expect(result[0]).toHaveProperty("count");
  });

  it("deve rejeitar sem startDate e endDate", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.dashboard.leadsByPeriod({} as any)
    ).rejects.toThrow();
  });
});
