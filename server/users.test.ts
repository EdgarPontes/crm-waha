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

const mockUsersState: {
  users: Array<{
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
  users: [],
};

vi.mock("./db", async () => {
  const actual =
    await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    listUsers: vi.fn(async () =>
      mockUsersState.users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        loginMethod: u.loginMethod,
        role: u.role,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastSignedIn: u.lastSignedIn,
      }))
    ),
    listUsersByRole: vi.fn(async (role: string) =>
      mockUsersState.users
        .filter(u => u.role === role)
        .map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          loginMethod: u.loginMethod,
          role: u.role,
          emailVerified: u.emailVerified,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          lastSignedIn: u.lastSignedIn,
        }))
    ),
    getUserByIdPublic: vi.fn(async (id: number) => {
      const found = mockUsersState.users.find(u => u.id === id);
      if (!found) return undefined;
      return {
        id: found.id,
        email: found.email,
        name: found.name,
        loginMethod: found.loginMethod,
        role: found.role,
        emailVerified: found.emailVerified,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt,
        lastSignedIn: found.lastSignedIn,
      };
    }),
    getUserByEmail: vi.fn(async (email: string) => {
      return mockUsersState.users.find(u => u.email === email);
    }),
    getUserStats: vi.fn(async () => {
      const total = mockUsersState.users.length;
      const administrators = mockUsersState.users.filter(
        u => u.role === "Administrador"
      ).length;
      const supervisors = mockUsersState.users.filter(
        u => u.role === "Supervisor"
      ).length;
      const atendentes = mockUsersState.users.filter(
        u => u.role === "Atendente"
      ).length;
      const verified = mockUsersState.users.filter(u => u.emailVerified)
        .length;
      return { total, administrators, supervisors, atendentes, verified };
    }),
    createLocalUser: vi.fn(
      async (
        email: string,
        _password: string,
        name?: string,
        role: "Administrador" | "Supervisor" | "Atendente" = "Atendente"
      ) => {
        if (mockUsersState.users.some(u => u.email === email)) {
          throw new Error("User with this email already exists");
        }
        const newUser = {
          id: mockUsersState.users.length + 1,
          email,
          name: name || email.split("@")[0],
          loginMethod: "local",
          role,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
        mockUsersState.users.push(newUser);
        return {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          loginMethod: newUser.loginMethod,
          role: newUser.role,
          emailVerified: newUser.emailVerified,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          lastSignedIn: newUser.lastSignedIn,
        };
      }
    ),
    updateUserInfo: vi.fn(
      async (id: number, data: { name?: string; email?: string }) => {
        const idx = mockUsersState.users.findIndex(u => u.id === id);
        if (idx >= 0) {
          if (data.name !== undefined) mockUsersState.users[idx].name = data.name;
          if (data.email !== undefined)
            mockUsersState.users[idx].email = data.email;
          mockUsersState.users[idx].updatedAt = new Date();
        }
        return null;
      }
    ),
    updateUserRole: vi.fn(async (id: number, role: string) => {
      const idx = mockUsersState.users.findIndex(u => u.id === id);
      if (idx >= 0) {
        mockUsersState.users[idx].role = role;
        mockUsersState.users[idx].updatedAt = new Date();
      }
      return null;
    }),
    updateUserPassword: vi.fn(async (_id: number, _newPassword: string) => true),
    setUserEmailVerified: vi.fn(async (id: number) => {
      const idx = mockUsersState.users.findIndex(u => u.id === id);
      if (idx >= 0) {
        mockUsersState.users[idx].emailVerified = true;
        mockUsersState.users[idx].updatedAt = new Date();
      }
      return true;
    }),
    deleteUser: vi.fn(async (id: number) => {
      const idx = mockUsersState.users.findIndex(u => u.id === id);
      if (idx >= 0) mockUsersState.users.splice(idx, 1);
      return null;
    }),
    createAuditLog: vi.fn(async () => null),
  };
});

beforeEach(() => {
  mockUsersState.users = [
    {
      id: 1,
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "local",
      role: "Administrador",
      emailVerified: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      lastSignedIn: new Date("2024-06-01"),
    },
    {
      id: 2,
      email: "supervisor@example.com",
      name: "Supervisor User",
      loginMethod: "local",
      role: "Supervisor",
      emailVerified: true,
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-01"),
      lastSignedIn: new Date("2024-06-02"),
    },
    {
      id: 3,
      email: "agent@example.com",
      name: "Agent User",
      loginMethod: "local",
      role: "Atendente",
      emailVerified: false,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
      lastSignedIn: new Date("2024-06-03"),
    },
  ];
});

describe("users.list", () => {
  it("retorna todos os usuários para qualquer usuário autenticado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();

    expect(result).toHaveLength(3);
    expect(result[0]).not.toHaveProperty("passwordHash");
  });

  it("filtra por role quando fornecido", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list({ role: "Supervisor" });

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe("Supervisor");
  });

  it("filtra por texto de busca (email ou nome)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list({ search: "agent" });

    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe("agent@example.com");
  });

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow(TRPCError);
  });
});

describe("users.stats", () => {
  it("calcula estatísticas por perfil", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.stats();

    expect(result).toEqual({
      total: 3,
      administrators: 1,
      supervisors: 1,
      atendentes: 1,
      verified: 2,
    });
  });
});

describe("users.create", () => {
  it("admin pode criar novo usuário com perfil padrão", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create({
      email: "newagent@example.com",
      password: "securepass123",
      name: "New Agent",
      role: "Atendente",
    });

    expect(result.email).toBe("newagent@example.com");
    expect(result.role).toBe("Atendente");
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejeita supervisor (apenas admin pode criar)", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create({
        email: "newagent@example.com",
        password: "securepass123",
        name: "New Agent",
        role: "Atendente",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita atendente", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create({
        email: "newagent@example.com",
        password: "securepass123",
        name: "New Agent",
        role: "Atendente",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita email duplicado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create({
        email: "admin@example.com",
        password: "securepass123",
        name: "Duplicate",
        role: "Atendente",
      })
    ).rejects.toThrow(/already exists|existe/i);
  });

  it("rejeita senha com menos de 8 caracteres (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create({
        email: "short@example.com",
        password: "123",
        name: "Short",
        role: "Atendente",
      })
    ).rejects.toThrow();
  });
});

describe("users.updateRole", () => {
  it("admin pode alterar perfil de outro usuário", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.updateRole({
      id: 3,
      role: "Supervisor",
    });

    expect(result).toEqual({ success: true, id: 3, role: "Supervisor" });
  });

  it("admin não pode remover o próprio perfil de administrador", async () => {
    const ctx = makeContext(makeUser({ id: 1, role: "Administrador" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.updateRole({ id: 1, role: "Atendente" })
    ).rejects.toThrow(/próprio|own/i);
  });

  it("rejeita supervisor tentando alterar perfil", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.updateRole({ id: 3, role: "Supervisor" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("users.update", () => {
  it("admin pode atualizar nome e email", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.update({
      id: 3,
      name: "Updated Name",
      email: "updated@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita atualização por não-admin", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.update({ id: 1, name: "Hack" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("users.resetPassword", () => {
  it("admin pode redefinir senha de outro usuário", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.resetPassword({
      id: 3,
      newPassword: "newpassword123",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita senha inválida pela validação Zod", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.resetPassword({ id: 3, newPassword: "123" })
    ).rejects.toThrow();
  });
});

describe("users.delete", () => {
  it("admin pode excluir outro usuário", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.delete({ id: 3 });

    expect(result.success).toBe(true);
    expect(mockUsersState.users).toHaveLength(2);
  });

  it("admin não pode excluir a si mesmo", async () => {
    const ctx = makeContext(makeUser({ id: 1, role: "Administrador" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.delete({ id: 1 })).rejects.toThrow(
      /próprio|own/i
    );
  });

  it("rejeita exclusão por supervisor", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.delete({ id: 3 })).rejects.toThrow(TRPCError);
  });
});

describe("users.checkPermission", () => {
  it("administrador pode fazer ações de atendente", async () => {
    const ctx = makeContext(makeUser({ id: 1, role: "Administrador" }));
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.checkPermission({
      requiredRole: "Atendente",
    });

    expect(result.allowed).toBe(true);
  });

  it("atendente NÃO pode fazer ações de administrador", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.checkPermission({
      requiredRole: "Administrador",
    });

    expect(result.allowed).toBe(false);
  });

  it("supervisor pode fazer ações de atendente mas não de admin", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    const atendenteCheck = await caller.users.checkPermission({
      requiredRole: "Atendente",
    });
    const adminCheck = await caller.users.checkPermission({
      requiredRole: "Administrador",
    });

    expect(atendenteCheck.allowed).toBe(true);
    expect(adminCheck.allowed).toBe(false);
  });
});

describe("users.listForAssignment", () => {
  it("supervisor pode listar usuários para atribuição", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.listForAssignment();

    expect(result).toHaveLength(3);
  });

  it("atendente NÃO pode listar usuários para atribuição", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.listForAssignment()).rejects.toThrow(TRPCError);
  });
});
