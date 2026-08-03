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

type Tag = { id: number; name: string; color: string };

const mockTagsState: { tags: Tag[]; nextId: number } = {
  tags: [],
  nextId: 1,
};

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    createTag: vi.fn(async (name: string, color = "#3b82f6") => {
      const newTag: Tag = { id: mockTagsState.nextId++, name, color };
      mockTagsState.tags.push(newTag);
      return newTag;
    }),
    listTags: vi.fn(async () => {
      return [...mockTagsState.tags];
    }),
    getTagByName: vi.fn(async (name: string) => {
      return mockTagsState.tags.find((t) => t.name === name) ?? null;
    }),
    deleteTag: vi.fn(async (id: number) => {
      const idx = mockTagsState.tags.findIndex((t) => t.id === id);
      if (idx >= 0) mockTagsState.tags.splice(idx, 1);
      return null;
    }),
    updateTag: vi.fn(
      async (id: number, data: { name?: string; color?: string }) => {
        const idx = mockTagsState.tags.findIndex((t) => t.id === id);
        if (idx >= 0) {
          if (data.name !== undefined) mockTagsState.tags[idx].name = data.name;
          if (data.color !== undefined)
            mockTagsState.tags[idx].color = data.color;
        }
        return null;
      }
    ),
    addTagToLead: vi.fn(async (_leadId: number, _tagName: string) => {
      return null;
    }),
    removeTagFromLead: vi.fn(async (_leadId: number, _tagName: string) => {
      return null;
    }),
    updateLeadTags: vi.fn(async (_leadId: number, _tags: string[]) => {
      return null;
    }),
    createAuditLog: vi.fn(async () => null),
  };
});

beforeEach(() => {
  mockTagsState.tags = [
    { id: 1, name: "vip", color: "#ff0000" },
    { id: 2, name: "urgent", color: "#ffaa00" },
  ];
  mockTagsState.nextId = 3;
});

describe("tags.create", () => {
  it("admin pode criar uma tag", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.create({ name: "new-tag" });

    expect(result).toBeDefined();
    expect(result?.name).toBe("new-tag");
    expect(result?.color).toBe("#3b82f6");
    expect(mockTagsState.tags).toHaveLength(3);
  });

  it("admin pode criar tag com cor personalizada", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.create({
      name: "custom",
      color: "#00ff00",
    });

    expect(result?.name).toBe("custom");
    expect(result?.color).toBe("#00ff00");
  });

  it("rejeita supervisor (apenas admin pode criar)", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.create({ name: "fail" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita atendente", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.create({ name: "fail" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.create({ name: "fail" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita nome duplicado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.create({ name: "vip" })
    ).rejects.toThrow(/já existe/i);
  });

  it("rejeita cor em formato inválido", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.create({ name: "bad-color", color: "red" })
    ).rejects.toThrow();
  });
});

describe("tags.list", () => {
  it("retorna todas as tags para usuário autenticado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.list();

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("color");
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tags.list()).rejects.toThrow(TRPCError);
  });
});

describe("tags.get", () => {
  it("retorna tag pelo nome", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.get({ name: "vip" });

    expect(result).toBeDefined();
    expect(result?.name).toBe("vip");
    expect(result?.color).toBe("#ff0000");
  });

  it("retorna null para tag inexistente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.get({ name: "nonexistent" });

    expect(result).toBeNull();
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tags.get({ name: "vip" })).rejects.toThrow(TRPCError);
  });
});

describe("tags.update", () => {
  it("admin pode atualizar nome e cor de uma tag", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.update({
      id: 1,
      name: "vip-updated",
      color: "#0000ff",
    });

    expect(result).toBeNull();
    const updated = mockTagsState.tags.find((t) => t.id === 1);
    expect(updated?.name).toBe("vip-updated");
    expect(updated?.color).toBe("#0000ff");
  });

  it("admin pode atualizar apenas o nome", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.tags.update({ id: 1, name: "only-name" });

    const updated = mockTagsState.tags.find((t) => t.id === 1);
    expect(updated?.name).toBe("only-name");
    expect(updated?.color).toBe("#ff0000");
  });

  it("rejeita supervisor", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.update({ id: 1, name: "fail" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita cor em formato inválido", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.update({ id: 1, color: "invalid" })
    ).rejects.toThrow();
  });
});

describe("tags.delete", () => {
  it("admin pode excluir uma tag", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.delete({ id: 1 });

    expect(result).toEqual({ success: true, id: 1 });
    expect(mockTagsState.tags).toHaveLength(1);
    expect(mockTagsState.tags.find((t) => t.id === 1)).toBeUndefined();
  });

  it("rejeita supervisor", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tags.delete({ id: 1 })).rejects.toThrow(TRPCError);
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tags.delete({ id: 1 })).rejects.toThrow(TRPCError);
  });
});

describe("tags.addToLead", () => {
  it("adiciona tag a um lead", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.addToLead({
      leadId: 1,
      tagName: "vip",
    });

    expect(result).toBeNull();
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.addToLead({ leadId: 1, tagName: "vip" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("tags.removeFromLead", () => {
  it("remove tag de um lead", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.removeFromLead({
      leadId: 1,
      tagName: "vip",
    });

    expect(result).toBeNull();
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.removeFromLead({ leadId: 1, tagName: "vip" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("tags.updateLeadTags", () => {
  it("atualiza todas as tags de um lead", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.updateLeadTags({
      leadId: 1,
      tags: ["vip", "urgent", "new"],
    });

    expect(result).toBeNull();
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tags.updateLeadTags({ leadId: 1, tags: ["vip"] })
    ).rejects.toThrow(TRPCError);
  });
});
