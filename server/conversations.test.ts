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

const mockContact = {
  id: 1,
  name: "John Doe",
  whatsappNumber: "5511999999999",
  email: "john@example.com",
  phone: "5511999999999",
};

const {
  mockWahaSendMessage,
  mockWahaSendMediaMessage,
} = vi.hoisted(() => ({
  mockWahaSendMessage: vi.fn(async () => ({})),
  mockWahaSendMediaMessage: vi.fn(async () => ({})),
}));

const mockConversationsState: Array<any> = [];
const mockMessagesState: Array<any> = [];
const mockNotesState: Array<any> = [];

(globalThis as any).broadcast = vi.fn();

vi.mock("./waha-client", () => ({
  getWAHAClient: vi.fn(async () => ({
    sendMessage: mockWahaSendMessage,
    sendMediaMessage: mockWahaSendMediaMessage,
  })),
}));

vi.mock("./db", async () => {
  const actual =
    await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    listConversations: vi.fn(
      async (status?: string, limit = 50, offset = 0, _tag?: string) => {
        let result = [...mockConversationsState];
        if (status) {
          result = result.filter((c) => c.status === status);
        }
        if (_tag) {
          result = result.filter((c) => c.tag === _tag);
        }
        return result.slice(offset, offset + limit);
      }
    ),
    getConversationById: vi.fn(async (id: number) => {
      return mockConversationsState.find((c) => c.id === id) || null;
    }),
    getContactById: vi.fn(async (id: number) => {
      if (id === mockContact.id) return { ...mockContact };
      return null;
    }),
    listMessagesByConversation: vi.fn(
      async (conversationId: number, limit = 50, offset = 0) => {
        const filtered = mockMessagesState.filter(
          (m) => m.conversationId === conversationId
        );
        return filtered.slice(offset, offset + limit);
      }
    ),
    listNotesByConversation: vi.fn(async (conversationId: number) => {
      return mockNotesState.filter((n) => n.conversationId === conversationId);
    }),
    getOrCreateConversation: vi.fn(
      async (contactId: number, leadId?: number) => {
        const existing = mockConversationsState.find(
          (c) => c.contactId === contactId
        );
        if (existing) return { ...existing };
        const newConv = {
          id: mockConversationsState.length + 1,
          contactId,
          leadId: leadId || null,
          status: "active",
          currentAssignedUserId: null,
          lastMessageAt: null,
          tag: null,
          createdAt: new Date("2024-04-01"),
          updatedAt: new Date("2024-04-01"),
          contact: { ...mockContact },
        };
        mockConversationsState.push(newConv);
        return { ...newConv };
      }
    ),
    updateConversationStatus: vi.fn(
      async (conversationId: number, status: string) => {
        const idx = mockConversationsState.findIndex(
          (c) => c.id === conversationId
        );
        if (idx >= 0) mockConversationsState[idx].status = status;
        return mockConversationsState[idx] || null;
      }
    ),
    assignConversationToUser: vi.fn(
      async (conversationId: number, userId: number) => {
        const idx = mockConversationsState.findIndex(
          (c) => c.id === conversationId
        );
        if (idx >= 0)
          mockConversationsState[idx].currentAssignedUserId = userId;
        return mockConversationsState[idx] || null;
      }
    ),
    createMessage: vi.fn(
      async (
        conversationId: number,
        type: string,
        content?: string,
        mediaUrl?: string,
        senderId?: number,
        senderPhone?: string
      ) => {
        const message = {
          id: mockMessagesState.length + 1,
          conversationId,
          type,
          content: content || null,
          mediaUrl: mediaUrl || null,
          senderId: senderId || null,
          senderPhone: senderPhone || null,
          status: "sent",
          createdAt: new Date("2024-06-15T10:00:00"),
        };
        mockMessagesState.push(message);
        return { ...message };
      }
    ),
    createNote: vi.fn(
      async (conversationId: number, userId: number, content: string) => {
        const note = {
          id: mockNotesState.length + 1,
          conversationId,
          userId,
          content,
          createdAt: new Date("2024-06-15T11:00:00"),
        };
        mockNotesState.push(note);
        return { ...note };
      }
    ),
    listWhatsAppSessions: vi.fn(async () => [
      { id: 1, sessionName: "default", status: "connected" },
    ]),
    createAuditLog: vi.fn(async () => null),
  };
});

beforeEach(() => {
  mockConversationsState.length = 0;
  mockMessagesState.length = 0;
  mockNotesState.length = 0;

  mockConversationsState.push(
    {
      id: 1,
      contactId: 1,
      leadId: null,
      status: "active",
      currentAssignedUserId: null,
      lastMessageAt: new Date("2024-06-01"),
      tag: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      contact: { ...mockContact },
    },
    {
      id: 2,
      contactId: null,
      leadId: null,
      status: "waiting_human",
      currentAssignedUserId: null,
      lastMessageAt: new Date("2024-06-02"),
      tag: "vip",
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-01"),
      contact: null,
    },
    {
      id: 3,
      contactId: null,
      leadId: null,
      status: "closed",
      currentAssignedUserId: null,
      lastMessageAt: new Date("2024-06-03"),
      tag: null,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
      contact: null,
    }
  );

  mockMessagesState.push({
    id: 1,
    conversationId: 1,
    type: "text",
    content: "Hello",
    mediaUrl: null,
    senderId: 1,
    senderPhone: "5511999999999",
    status: "sent",
    createdAt: new Date("2024-06-01T10:00:00"),
  });

  mockNotesState.push({
    id: 1,
    conversationId: 1,
    userId: 1,
    content: "Note for this conversation",
    createdAt: new Date("2024-06-01T11:00:00"),
  });

  vi.clearAllMocks();
  (globalThis as any).broadcast = vi.fn();
  (globalThis as any).broadcastToConversation = vi.fn();
  (globalThis as any).broadcastToAll = vi.fn();
});

// =============================================================================
// Auth
// =============================================================================

describe("conversations.auth", () => {
  it("rejeita usuário não autenticado ao listar", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.conversations.list({})).rejects.toThrow(TRPCError);
  });

  it("rejeita usuário não autenticado ao buscar", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.conversations.get({ id: 1 })).rejects.toThrow(
      TRPCError
    );
  });

  it("rejeita usuário não autenticado ao listar mensagens", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.conversations.messages.list({ conversationId: 1 })
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita usuário não autenticado ao listar notas", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.conversations.notes.list({ conversationId: 1 })
    ).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// conversations.list
// =============================================================================

describe("conversations.list", () => {
  it("retorna todas as conversas", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.list({});

    expect(result).toHaveLength(3);
    expect(result[0]?.status).toBe("active");
  });

  it("filtra por status", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.list({ status: "closed" });

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe("closed");
  });

  it("filtra por tag", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.list({ tag: "vip" });

    expect(result).toHaveLength(1);
    expect(result[0]?.tag).toBe("vip");
  });
});

// =============================================================================
// conversations.get
// =============================================================================

describe("conversations.get", () => {
  it("retorna conversa com contact, messages e notes", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.get({ id: 1 });

    expect(result).not.toBeNull();
    expect(result?.contact).not.toBeNull();
    expect(result?.contact?.name).toBe("John Doe");
    expect(result?.messages).toHaveLength(1);
    expect(result?.messages?.[0]?.content).toBe("Hello");
    expect(result?.notes).toHaveLength(1);
    expect(result?.notes?.[0]?.content).toBe("Note for this conversation");
  });

  it("retorna null para conversa inexistente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.get({ id: 999 });

    expect(result).toBeNull();
  });
});

// =============================================================================
// conversations.getOrCreate
// =============================================================================

describe("conversations.getOrCreate", () => {
  it("cria nova conversa", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.getOrCreate({
      contactId: 2,
      leadId: 5,
    });

    expect(result).not.toBeNull();
    expect(result?.contactId).toBe(2);
    expect(result?.leadId).toBe(5);
    expect(result?.status).toBe("active");
  });

  it("retorna conversa existente", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.getOrCreate({
      contactId: 1,
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(1);
    expect(result?.contactId).toBe(1);
  });
});

// =============================================================================
// conversations.updateStatus
// =============================================================================

describe("conversations.updateStatus", () => {
  it("atualiza status da conversa", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.updateStatus({
      conversationId: 1,
      status: "closed",
    });

    expect(result?.status).toBe("closed");
    expect(mockConversationsState[0]?.status).toBe("closed");
  });

  it("registra audit log ao atualizar status", async () => {
    const { createAuditLog } = await import("./db");
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.updateStatus({
      conversationId: 1,
      status: "closed",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "update",
      "conversation",
      1,
      { field: "status", value: "closed" }
    );
  });

  it("rejeita status inválido (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.conversations.updateStatus({
        conversationId: 1,
        status: "invalid" as any,
      })
    ).rejects.toThrow();
  });
});

// =============================================================================
// conversations.assignToUser
// =============================================================================

describe("conversations.assignToUser", () => {
  it("atribui conversa a usuário", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.assignToUser({
      conversationId: 1,
      userId: 2,
    });

    expect(result?.currentAssignedUserId).toBe(2);
    expect(mockConversationsState[0]?.currentAssignedUserId).toBe(2);
  });

  it("registra audit log ao atribuir usuário", async () => {
    const { createAuditLog } = await import("./db");
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.assignToUser({
      conversationId: 1,
      userId: 2,
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "transfer_conversation",
      "conversation",
      1,
      { assignedTo: 2 }
    );
  });
});

// =============================================================================
// conversations.requestHuman
// =============================================================================

describe("conversations.requestHuman", () => {
  it("solicita atendimento humano", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.requestHuman({
      conversationId: 1,
    });

    expect(result?.status).toBe("waiting_human");
    expect(mockConversationsState[0]?.status).toBe("waiting_human");
  });

  it("registra audit log ao solicitar humano", async () => {
    const { createAuditLog } = await import("./db");
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.requestHuman({
      conversationId: 1,
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "update",
      "conversation",
      1,
      { reason: "human_requested" }
    );
  });
});

// =============================================================================
// conversations.messages.list
// =============================================================================

describe("conversations.messages.list", () => {
  it("lista mensagens da conversa", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.messages.list({
      conversationId: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe("Hello");
    expect(result[0]?.type).toBe("text");
  });

  it("retorna array vazio para conversa sem mensagens", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.messages.list({
      conversationId: 999,
    });

    expect(result).toEqual([]);
  });
});

// =============================================================================
// conversations.messages.send
// =============================================================================

describe("conversations.messages.send", () => {
  it("envia mensagem de texto", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.messages.send({
      conversationId: 1,
      type: "text",
      content: "Olá cliente",
    });

    expect(result).not.toBeNull();
    expect(result?.type).toBe("text");
    expect(result?.content).toBe("Olá cliente");
    expect(result?.conversationId).toBe(1);
    expect(result?.senderId).toBe(1);
  });

  it("dispara envio via WAHA quando contato tem WhatsApp", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.messages.send({
      conversationId: 1,
      type: "text",
      content: "Mensagem WAHA",
    });

    expect(mockWahaSendMessage).toHaveBeenCalledWith(
      "default",
      "5511999999999@c.us",
      "Mensagem WAHA"
    );
  });

  it("faz broadcast via WebSocket ao enviar mensagem", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.messages.send({
      conversationId: 1,
      type: "text",
      content: "Broadcast test",
    });

    expect(
      (globalThis as any).broadcastToConversation
    ).toHaveBeenCalledWith(1, {
      type: "new_message",
      conversationId: 1,
      message: expect.objectContaining({ content: "Broadcast test" }),
    });

    expect((globalThis as any).broadcastToAll).toHaveBeenCalledWith({
      type: "conversation_updated",
      conversationId: 1,
    });
  });

  it("registra audit log ao enviar mensagem", async () => {
    const { createAuditLog } = await import("./db");
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.messages.send({
      conversationId: 1,
      type: "image",
      mediaUrl: "https://example.com/photo.jpg",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "send_message",
      "message",
      expect.any(Number),
      { type: "image" }
    );
  });

  it("envia mensagem de mídia e dispara WAHA", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.messages.send({
      conversationId: 1,
      type: "image",
      mediaUrl: "https://example.com/photo.jpg",
    });

    expect(mockWahaSendMediaMessage).toHaveBeenCalledWith(
      "default",
      "5511999999999@c.us",
      "https://example.com/photo.jpg",
      "image",
      undefined
    );
  });

  it("rejeita tipo inválido (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.conversations.messages.send({
        conversationId: 1,
        type: "invalid_type" as any,
      })
    ).rejects.toThrow();
  });
});

// =============================================================================
// conversations.notes.list
// =============================================================================

describe("conversations.notes.list", () => {
  it("lista notas da conversa", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.notes.list({
      conversationId: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe("Note for this conversation");
  });

  it("retorna array vazio para conversa sem notas", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.notes.list({
      conversationId: 999,
    });

    expect(result).toEqual([]);
  });
});

// =============================================================================
// conversations.notes.create
// =============================================================================

describe("conversations.notes.create", () => {
  it("cria nota", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.notes.create({
      conversationId: 1,
      content: "Nova nota de teste",
    });

    expect(result).not.toBeNull();
    expect(result?.content).toBe("Nova nota de teste");
    expect(result?.conversationId).toBe(1);
    expect(result?.userId).toBe(1);
  });

  it("registra audit log ao criar nota", async () => {
    const { createAuditLog } = await import("./db");
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await caller.conversations.notes.create({
      conversationId: 1,
      content: "Nota auditada",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      1,
      "create",
      "note",
      expect.any(Number),
      { conversationId: 1 }
    );
  });

  it("rejeita content vazio (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      // Zod string() requires a string, but passing undefined should fail
      caller.conversations.notes.create({
        conversationId: 1,
        content: undefined as any,
      })
    ).rejects.toThrow();
  });
});
