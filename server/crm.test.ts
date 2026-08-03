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

const mockPipelines: Array<{
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}> = [];

const mockStages: Array<{
  id: number;
  pipelineId: number;
  name: string;
  order: number;
  createdAt: Date;
}> = [];

const mockLeads: Array<{
  id: number;
  contactId: number;
  stageId: number;
  assignedToUserId: number | null;
  tags: string[];
  notes: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}> = [];

const mockContacts: Array<{
  id: number;
  whatsappNumber: string;
  name: string | null;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastInteractionAt: Date;
}> = [];

vi.mock("./db", async () => {
  const actual =
    await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    listPipelines: vi.fn(async () =>
      mockPipelines.map((p) => ({ ...p }))
    ),
    getPipeline: vi.fn(async (id: number) => {
      const found = mockPipelines.find((p) => p.id === id);
      return found ? { ...found } : null;
    }),
    getDefaultPipeline: vi.fn(async () => {
      const found = mockPipelines.find((p) => p.isDefault);
      return found ? { ...found } : null;
    }),
    createPipeline: vi.fn(async (name: string, description?: string) => {
      const id = mockPipelines.length + 1;
      const newPipeline = {
        id,
        name,
        description: description || null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPipelines.push(newPipeline);
      return { ...newPipeline };
    }),
    updatePipeline: vi.fn(
      async (id: number, data: { name?: string; description?: string }) => {
        const idx = mockPipelines.findIndex((p) => p.id === id);
        if (idx !== -1) {
          if (data.name !== undefined) mockPipelines[idx].name = data.name;
          if (data.description !== undefined)
            mockPipelines[idx].description = data.description;
          mockPipelines[idx].updatedAt = new Date();
        }
        return null;
      }
    ),
    deletePipeline: vi.fn(async (id: number) => {
      const idx = mockPipelines.findIndex((p) => p.id === id);
      if (idx !== -1) {
        mockPipelines.splice(idx, 1);
        // Delete associated stages and leads
        const stageIds = mockStages
          .filter((s) => s.pipelineId === id)
          .map((s) => s.id);
        for (const sid of stageIds) {
          const leadIndices = [];
          for (let i = mockLeads.length - 1; i >= 0; i--) {
            if (mockLeads[i].stageId === sid) leadIndices.push(i);
          }
          for (const li of leadIndices) mockLeads.splice(li, 1);
        }
        for (let i = mockStages.length - 1; i >= 0; i--) {
          if (mockStages[i].pipelineId === id) mockStages.splice(i, 1);
        }
      }
      return null;
    }),
    getStagesByPipeline: vi.fn(async (pipelineId: number) =>
      mockStages
        .filter((s) => s.pipelineId === pipelineId)
        .map((s) => ({ ...s }))
        .sort((a, b) => a.order - b.order)
    ),
    createStage: vi.fn(
      async (pipelineId: number, name: string, order?: number) => {
        const id = mockStages.length + 1;
        const newStage = {
          id,
          pipelineId,
          name,
          order: order !== undefined ? order : 0,
          createdAt: new Date(),
        };
        mockStages.push(newStage);
        return { ...newStage };
      }
    ),
    updateStage: vi.fn(
      async (id: number, data: { name?: string; order?: number }) => {
        const idx = mockStages.findIndex((s) => s.id === id);
        if (idx !== -1) {
          if (data.name !== undefined) mockStages[idx].name = data.name;
          if (data.order !== undefined) mockStages[idx].order = data.order;
        }
        return null;
      }
    ),
    deleteStage: vi.fn(async (id: number) => {
      const idx = mockStages.findIndex((s) => s.id === id);
      if (idx !== -1) mockStages.splice(idx, 1);
      return null;
    }),
    listLeadsByPipeline: vi.fn(async (pipelineId: number) => {
      const pipelineStageIds = mockStages
        .filter((s) => s.pipelineId === pipelineId)
        .map((s) => s.id);
      return mockLeads
        .filter((l) => pipelineStageIds.includes(l.stageId))
        .map((l) => ({ ...l }));
    }),
    listLeadsByStage: vi.fn(async (stageId: number) =>
      mockLeads.filter((l) => l.stageId === stageId).map((l) => ({ ...l }))
    ),
    getOrCreateContact: vi.fn(
      async (whatsappNumber: string, name?: string) => {
        const existing = mockContacts.find(
          (c) => c.whatsappNumber === whatsappNumber
        );
        if (existing) return { ...existing };
        const id = mockContacts.length + 1;
        const newContact = {
          id,
          whatsappNumber,
          name: name || whatsappNumber,
          avatar: null,
          email: null,
          phone: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastInteractionAt: new Date(),
        };
        mockContacts.push(newContact);
        return { ...newContact };
      }
    ),
    createLead: vi.fn(async (contactId: number, stageId: number) => {
      const id = mockLeads.length + 1;
      const newLead = {
        id,
        contactId,
        stageId,
        assignedToUserId: null,
        tags: [],
        notes: null,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
      };
      mockLeads.push(newLead);
      return { ...newLead };
    }),
    updateLead: vi.fn(
      async (
        id: number,
        data: {
          notes?: string;
          dueDate?: Date | null;
          tags?: string[];
          assignedToUserId?: number | null;
        }
      ) => {
        const idx = mockLeads.findIndex((l) => l.id === id);
        if (idx !== -1) {
          if (data.notes !== undefined) mockLeads[idx].notes = data.notes;
          if (data.dueDate !== undefined) mockLeads[idx].dueDate = data.dueDate;
          if (data.tags !== undefined) mockLeads[idx].tags = data.tags;
          if (data.assignedToUserId !== undefined)
            mockLeads[idx].assignedToUserId = data.assignedToUserId;
          mockLeads[idx].updatedAt = new Date();
        }
        return null;
      }
    ),
    deleteLead: vi.fn(async (id: number) => {
      const idx = mockLeads.findIndex((l) => l.id === id);
      if (idx !== -1) mockLeads.splice(idx, 1);
      return null;
    }),
    moveLeadToStage: vi.fn(async (leadId: number, stageId: number) => {
      const idx = mockLeads.findIndex((l) => l.id === leadId);
      if (idx !== -1) {
        mockLeads[idx].stageId = stageId;
        mockLeads[idx].updatedAt = new Date();
      }
      return null;
    }),
    updateLeadTags: vi.fn(async (leadId: number, tags: string[]) => {
      const idx = mockLeads.findIndex((l) => l.id === leadId);
      if (idx !== -1) {
        mockLeads[idx].tags = tags;
        mockLeads[idx].updatedAt = new Date();
      }
      return null;
    }),
    updateLeadAssignee: vi.fn(
      async (leadId: number, assignedToUserId: number | null) => {
        const idx = mockLeads.findIndex((l) => l.id === leadId);
        if (idx !== -1) {
          mockLeads[idx].assignedToUserId = assignedToUserId;
          mockLeads[idx].updatedAt = new Date();
        }
        return null;
      }
    ),
    updateLeadDueDate: vi.fn(
      async (leadId: number, dueDate: Date | null) => {
        const idx = mockLeads.findIndex((l) => l.id === leadId);
        if (idx !== -1) {
          mockLeads[idx].dueDate = dueDate;
          mockLeads[idx].updatedAt = new Date();
        }
        return null;
      }
    ),
    listContacts: vi.fn(async (limit = 50, offset = 0) => {
      const copy = mockContacts.map((c) => ({ ...c }));
      copy.sort(
        (a, b) =>
          b.lastInteractionAt.getTime() - a.lastInteractionAt.getTime()
      );
      return copy.slice(offset, offset + limit);
    }),
    createContact: vi.fn(
      async (data: {
        name: string;
        whatsappNumber: string;
        email?: string;
        phone?: string;
      }) => {
        const id = mockContacts.length + 1;
        const newContact = {
          id,
          whatsappNumber: data.whatsappNumber,
          name: data.name,
          avatar: null,
          email: data.email || null,
          phone: data.phone || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastInteractionAt: new Date(),
        };
        mockContacts.push(newContact);
        return { ...newContact };
      }
    ),
    updateContact: vi.fn(
      async (
        contactId: number,
        data: {
          name?: string;
          whatsappNumber?: string;
          email?: string;
          phone?: string;
        }
      ) => {
        const idx = mockContacts.findIndex((c) => c.id === contactId);
        if (idx !== -1) {
          if (data.name !== undefined) mockContacts[idx].name = data.name;
          if (data.whatsappNumber !== undefined)
            mockContacts[idx].whatsappNumber = data.whatsappNumber;
          if (data.email !== undefined) mockContacts[idx].email = data.email;
          if (data.phone !== undefined) mockContacts[idx].phone = data.phone;
          mockContacts[idx].updatedAt = new Date();
        }
        return null;
      }
    ),
    deleteContact: vi.fn(async (contactId: number) => {
      const idx = mockContacts.findIndex((c) => c.id === contactId);
      if (idx !== -1) mockContacts.splice(idx, 1);
      return null;
    }),
    listUsers: vi.fn(async () => [
      { id: 1, email: "a@b.com", name: "Admin", loginMethod: "local", role: "Administrador", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      { id: 2, email: "s@b.com", name: "Sup", loginMethod: "local", role: "Supervisor", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    ]),
    createAuditLog: vi.fn(async () => null),
  };
});

beforeEach(() => {
  mockPipelines.length = 0;
  mockStages.length = 0;
  mockLeads.length = 0;
  mockContacts.length = 0;

  mockPipelines.push({
    id: 1,
    name: "Pipeline de Vendas",
    description: "Pipeline principal",
    isDefault: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  });

  mockStages.push({
    id: 1,
    pipelineId: 1,
    name: "Contato Inicial",
    order: 1,
    createdAt: new Date("2024-01-01"),
  });
  mockStages.push({
    id: 2,
    pipelineId: 1,
    name: "Negociação",
    order: 2,
    createdAt: new Date("2024-01-01"),
  });
  mockStages.push({
    id: 3,
    pipelineId: 1,
    name: "Fechado",
    order: 3,
    createdAt: new Date("2024-01-01"),
  });

  mockContacts.push({
    id: 1,
    whatsappNumber: "5511999999999",
    name: "João Silva",
    avatar: null,
    email: "joao@example.com",
    phone: "5511999999999",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    lastInteractionAt: new Date("2024-06-01"),
  });
  mockContacts.push({
    id: 2,
    whatsappNumber: "5511888888888",
    name: "Maria Souza",
    avatar: null,
    email: "maria@example.com",
    phone: "5511888888888",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
    lastInteractionAt: new Date("2024-06-02"),
  });

  mockLeads.push({
    id: 1,
    contactId: 1,
    stageId: 1,
    assignedToUserId: null,
    tags: [],
    notes: "Lead inicial",
    dueDate: null,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
    closedAt: null,
  });
  mockLeads.push({
    id: 2,
    contactId: 2,
    stageId: 2,
    assignedToUserId: 1,
    tags: ["vip"],
    notes: null,
    dueDate: new Date("2024-12-31"),
    createdAt: new Date("2024-03-02"),
    updatedAt: new Date("2024-03-02"),
    closedAt: null,
  });
});

// ============================================================================
// Pipelines
// ============================================================================

describe("crm.listPipelines", () => {
  it("retorna todas as pipelines para usuário autenticado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.listPipelines();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Pipeline de Vendas");
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.crm.listPipelines()).rejects.toThrow(TRPCError);
  });
});

describe("crm.getPipeline", () => {
  it("retorna pipeline por id", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.getPipeline({ id: 1 });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Pipeline de Vendas");
  });

  it("retorna null para pipeline inexistente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.getPipeline({ id: 999 });

    expect(result).toBeNull();
  });
});

describe("crm.createPipeline", () => {
  it("cria nova pipeline com nome", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.createPipeline({
      name: "Pipeline de Suporte",
    });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Pipeline de Suporte");
    expect(mockPipelines).toHaveLength(2);
  });

  it("cria pipeline com descrição", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.createPipeline({
      name: "Pipeline de Marketing",
      description: "Pipeline para leads de marketing",
    });

    expect(result?.description).toBe("Pipeline para leads de marketing");
  });

  it("rejeita nome vazio (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crm.createPipeline({ name: "" })
    ).rejects.toThrow();
  });
});

describe("crm.updatePipeline", () => {
  it("atualiza nome da pipeline", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updatePipeline({ id: 1, name: "Pipeline Atualizado" });

    expect(mockPipelines[0].name).toBe("Pipeline Atualizado");
  });

  it("atualiza descrição da pipeline", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updatePipeline({
      id: 1,
      description: "Nova descrição",
    });

    expect(mockPipelines[0].description).toBe("Nova descrição");
  });
});

describe("crm.deletePipeline", () => {
  it("remove pipeline e seus estágios", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    expect(mockStages.filter((s) => s.pipelineId === 1)).toHaveLength(3);
    await caller.crm.deletePipeline({ id: 1 });

    expect(mockPipelines).toHaveLength(0);
    expect(mockStages.filter((s) => s.pipelineId === 1)).toHaveLength(0);
  });

  it("rejeita pipeline inexistente sem erro", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.crm.deletePipeline({ id: 999 });
    expect(mockPipelines).toHaveLength(1);
  });
});

describe("crm.getDefaultPipeline", () => {
  it("retorna pipeline padrão", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.getDefaultPipeline();

    expect(result).not.toBeNull();
    expect(result?.isDefault).toBe(true);
  });

  it("retorna null quando não há pipeline padrão", async () => {
    mockPipelines[0].isDefault = false;
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.getDefaultPipeline();

    expect(result).toBeNull();
  });
});

// ============================================================================
// Stages
// ============================================================================

describe("crm.getStagesByPipeline", () => {
  it("retorna estágios ordenados por pipeline", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.getStagesByPipeline({ pipelineId: 1 });

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Contato Inicial");
    expect(result[1].name).toBe("Negociação");
    expect(result[2].name).toBe("Fechado");
  });

  it("retorna array vazio para pipeline sem estágios", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.getStagesByPipeline({ pipelineId: 999 });

    expect(result).toEqual([]);
  });
});

describe("crm.createStage", () => {
  it("cria novo estágio em pipeline existente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.createStage({
      pipelineId: 1,
      name: "Qualificação",
      order: 4,
    });

    expect(result?.name).toBe("Qualificação");
    expect(result?.order).toBe(4);
    expect(mockStages).toHaveLength(4);
  });

  it("rejeita nome vazio", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crm.createStage({ pipelineId: 1, name: "" })
    ).rejects.toThrow();
  });
});

describe("crm.updateStage", () => {
  it("atualiza nome do estágio", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateStage({ id: 1, name: "Novo Nome" });

    expect(mockStages[0].name).toBe("Novo Nome");
  });

  it("atualiza order do estágio", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateStage({ id: 1, order: 99 });

    expect(mockStages[0].order).toBe(99);
  });
});

describe("crm.deleteStage", () => {
  it("remove estágio", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.deleteStage({ id: 2 });

    expect(mockStages).toHaveLength(2);
    expect(mockStages.find((s) => s.id === 2)).toBeUndefined();
  });
});

// ============================================================================
// Leads
// ============================================================================

describe("crm.listLeadsByPipeline", () => {
  it("retorna leads do pipeline", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.listLeadsByPipeline({ pipelineId: 1 });

    expect(result).toHaveLength(2);
  });

  it("retorna array vazio para pipeline sem leads", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    // Pipeline sem estágios → sem stageIds → sem leads
    const result = await caller.crm.listLeadsByPipeline({ pipelineId: 999 });
    expect(result).toEqual([]);
  });
});

describe("crm.listLeadsByStage", () => {
  it("retorna leads de um estágio específico", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.listLeadsByStage({ stageId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("retorna array vazio para estágio sem leads", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.listLeadsByStage({ stageId: 999 });

    expect(result).toEqual([]);
  });
});

describe("crm.createLead", () => {
  it("cria lead associado a um novo contato", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.createLead({
      pipelineId: 1,
      stageId: 1,
      name: "Pedro Santos",
      phone: "5511777777777",
      email: "pedro@example.com",
      notes: "Lead de website",
    });

    expect(result).not.toBeNull();
    expect(mockLeads).toHaveLength(3);
    expect(mockContacts).toHaveLength(3);
  });

  it("cria lead associado a contato existente (mesmo whatsapp)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.createLead({
      pipelineId: 1,
      stageId: 2,
      name: "João Silva",
      phone: "5511999999999",
    });

    expect(mockLeads).toHaveLength(3);
    expect(mockLeads[2].contactId).toBe(1);
    expect(mockContacts).toHaveLength(2);
  });

  it("rejeita nome vazio", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crm.createLead({
        pipelineId: 1,
        stageId: 1,
        name: "",
      })
    ).rejects.toThrow();
  });
});

describe("crm.updateLead", () => {
  it("atualiza campos do lead", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateLead({
      id: 1,
      notes: "Notas atualizadas",
      tags: ["quente"],
      assignedToUserId: 2,
      dueDate: new Date("2024-12-25"),
    });

    expect(mockLeads[0].notes).toBe("Notas atualizadas");
    expect(mockLeads[0].tags).toEqual(["quente"]);
    expect(mockLeads[0].assignedToUserId).toBe(2);
    expect(mockLeads[0].dueDate).toEqual(new Date("2024-12-25"));
  });

  it("atualiza apenas campos fornecidos", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateLead({ id: 1, notes: "Apenas notas" });

    expect(mockLeads[0].notes).toBe("Apenas notas");
    expect(mockLeads[0].tags).toEqual([]);
    expect(mockLeads[0].assignedToUserId).toBeNull();
  });
});

describe("crm.deleteLead", () => {
  it("remove lead", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.deleteLead({ id: 1 });

    expect(mockLeads).toHaveLength(1);
  });
});

describe("crm.moveLeadToStage", () => {
  it("move lead para outro estágio e registra auditoria", async () => {
    const createAuditLog = (await import("./db")).createAuditLog;
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.moveLeadToStage({ leadId: 1, stageId: 3 });

    expect(mockLeads[0].stageId).toBe(3);
    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "move_kanban",
      "lead",
      1,
      { fromStageId: "unknown", toStageId: 3 }
    );
  });
});

describe("crm.updateLeadTags", () => {
  it("atualiza tags do lead e registra auditoria", async () => {
    const createAuditLog = (await import("./db")).createAuditLog;
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateLeadTags({
      leadId: 1,
      tags: ["quente", "urgente"],
    });

    expect(mockLeads[0].tags).toEqual(["quente", "urgente"]);
    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "update",
      "lead",
      1,
      { tags: ["quente", "urgente"] }
    );
  });

  it("aceita array vazio de tags", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateLeadTags({ leadId: 2, tags: [] });

    expect(mockLeads[1].tags).toEqual([]);
  });
});

describe("crm.updateLeadAssignee", () => {
  it("atribui lead a um usuário e registra auditoria", async () => {
    const createAuditLog = (await import("./db")).createAuditLog;
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateLeadAssignee({ leadId: 1, assignedToUserId: 2 });

    expect(mockLeads[0].assignedToUserId).toBe(2);
    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "update",
      "lead",
      1,
      { assignedToUserId: 2 }
    );
  });

  it("remove atribuição (assignedToUserId = null)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateLeadAssignee({ leadId: 2, assignedToUserId: null });

    expect(mockLeads[1].assignedToUserId).toBeNull();
  });
});

describe("crm.updateLeadDueDate", () => {
  it("define data de vencimento e registra auditoria", async () => {
    const createAuditLog = (await import("./db")).createAuditLog;
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const dueDate = new Date("2024-12-31");
    await caller.crm.updateLeadDueDate({ leadId: 1, dueDate });

    expect(mockLeads[0].dueDate).toEqual(dueDate);
    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "update",
      "lead",
      1,
      { dueDate }
    );
  });

  it("remove data de vencimento (dueDate = null)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateLeadDueDate({ leadId: 2, dueDate: null });

    expect(mockLeads[1].dueDate).toBeNull();
  });
});

// ============================================================================
// Contacts
// ============================================================================

describe("crm.listContacts", () => {
  it("retorna contatos com paginação padrão", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.listContacts({});

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Maria Souza");
  });

  it("respeita parâmetros de paginação", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.listContacts({ limit: 1, offset: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("João Silva");
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.crm.listContacts({})).rejects.toThrow(TRPCError);
  });
});

describe("crm.createContact", () => {
  it("cria novo contato com whatsapp", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.createContact({
      name: "Carlos Oliveira",
      whatsappNumber: "5511666666666",
    });

    expect(result?.name).toBe("Carlos Oliveira");
    expect(result?.whatsappNumber).toBe("5511666666666");
    expect(mockContacts).toHaveLength(3);
  });

  it("cria contato com email e phone opcionais", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.createContact({
      name: "Ana Lima",
      whatsappNumber: "5511555555555",
      email: "ana@example.com",
      phone: "5511555555555",
    });

    expect(result?.email).toBe("ana@example.com");
    expect(result?.phone).toBe("5511555555555");
  });

  it("rejeita nome vazio", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crm.createContact({ name: "", whatsappNumber: "5511000000000" })
    ).rejects.toThrow();
  });

  it("rejeita email inválido (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crm.createContact({
        name: "Test",
        whatsappNumber: "5511000000000",
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });
});

describe("crm.updateContact", () => {
  it("atualiza campos do contato", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.updateContact({
      id: 1,
      name: "João Silva Atualizado",
      email: "joao.novo@example.com",
    });

    expect(mockContacts[0].name).toBe("João Silva Atualizado");
    expect(mockContacts[0].email).toBe("joao.novo@example.com");
  });
});

describe("crm.deleteContact", () => {
  it("remove contato", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    await caller.crm.deleteContact({ id: 2 });

    expect(mockContacts).toHaveLength(1);
  });
});

// ============================================================================
// Users
// ============================================================================

describe("crm.listUsers", () => {
  it("retorna lista de usuários", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.crm.listUsers();

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("email");
    expect(result[0]).toHaveProperty("role");
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.crm.listUsers()).rejects.toThrow(TRPCError);
  });
});
