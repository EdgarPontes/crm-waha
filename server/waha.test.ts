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

const mockListSessions = vi.fn(async () => [
  {
    name: "session1",
    sessionName: "session1",
    status: "CONNECTED",
    me: { id: "5511999999999", pushName: "Test" },
  },
]);
const mockGetSession = vi.fn(async () => ({
  name: "session1",
  status: "CONNECTED",
  me: { id: "5511999999999", pushName: "Test" },
}));
const mockCreateSession = vi.fn(async () => ({
  name: "session1",
  status: "STARTING",
}));
const mockGetQRCode = vi.fn(async () => "data:image/png;base64,xxx");
const mockDisconnectSession = vi.fn(async () => {});
const mockDeleteSession = vi.fn(async () => {});
const mockSendMessage = vi.fn(async () => ({ id: "msg-1", messageId: "msg-1" }));
const mockSendMediaMessage = vi.fn(async () => ({ id: "msg-2", messageId: "msg-2" }));
const mockSendLocationMessage = vi.fn(async () => ({ id: "msg-3", messageId: "msg-3" }));
const mockGetMessages = vi.fn(async () => []);
const mockRegisterWebhook = vi.fn(async () => ({}));
const mockListWebhooks = vi.fn(async () => []);

vi.mock("./waha-client", () => ({
  getWAHAClient: vi.fn(async () => ({
    listSessions: mockListSessions,
    getSession: mockGetSession,
    createSession: mockCreateSession,
    getQRCode: mockGetQRCode,
    disconnectSession: mockDisconnectSession,
    deleteSession: mockDeleteSession,
    sendMessage: mockSendMessage,
    sendMediaMessage: mockSendMediaMessage,
    sendLocationMessage: mockSendLocationMessage,
    getMessages: mockGetMessages,
    registerWebhook: mockRegisterWebhook,
    listWebhooks: mockListWebhooks,
  })),
  initializeWAHAClient: vi.fn(),
  WAHAClient: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    getDb: vi.fn(async () => null),
    getOrCreateContact: vi.fn(async () => ({
      id: 1,
      phoneNumber: "5511999999999",
      name: null,
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastInteraction: null,
    })),
    getOrCreateConversation: vi.fn(async () => ({
      id: 1,
      contactId: 1,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    createMessage: vi.fn(async () => ({ id: 1 })),
    updateContactLastInteraction: vi.fn(async () => {}),
    getContactById: vi.fn(async () => null),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockListSessions.mockResolvedValue([
    {
      name: "session1",
      sessionName: "session1",
      status: "CONNECTED",
      me: { id: "5511999999999", pushName: "Test" },
    },
  ]);
  mockGetSession.mockResolvedValue({
    name: "session1",
    status: "CONNECTED",
    me: { id: "5511999999999", pushName: "Test" },
  });
  mockCreateSession.mockResolvedValue({
    name: "session1",
    status: "STARTING",
  });
  mockGetQRCode.mockResolvedValue("data:image/png;base64,xxx");
  mockDisconnectSession.mockResolvedValue(undefined);
  mockDeleteSession.mockResolvedValue(undefined);
  mockSendMessage.mockResolvedValue({ id: "msg-1", messageId: "msg-1" });
  mockSendMediaMessage.mockResolvedValue({ id: "msg-2", messageId: "msg-2" });
  mockSendLocationMessage.mockResolvedValue({ id: "msg-3", messageId: "msg-3" });
  mockGetMessages.mockResolvedValue([]);
  mockRegisterWebhook.mockResolvedValue({});
  mockListWebhooks.mockResolvedValue([]);
});

describe("waha.listSessions", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.waha.listSessions()).rejects.toThrow(TRPCError);
  });

  it("retorna sessões mescladas do WAHA e banco", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.listSessions();

    expect(result).toHaveProperty("dbSessions");
    expect(result).toHaveProperty("wahaSessions");
    expect(Array.isArray(result.dbSessions)).toBe(true);
    expect(Array.isArray(result.wahaSessions)).toBe(true);
  });
});

describe("waha.getSession", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.getSession({ sessionName: "session1" })
    ).rejects.toThrow(TRPCError);
  });

  it("retorna informações da sessão", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.getSession({ sessionName: "session1" });

    expect(result.name).toBe("session1");
    expect(result.status).toBe("CONNECTED");
    expect(mockGetSession).toHaveBeenCalledWith("session1");
  });

  it("rejeita quando sessionName não é fornecido (validação Zod)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.getSession({ sessionName: 123 as unknown as string })
    ).rejects.toThrow();
  });
});

describe("waha.createSession", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.createSession({ sessionName: "session1" })
    ).rejects.toThrow(TRPCError);
  });

  it("cria uma nova sessão com webhook", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.createSession({ sessionName: "session1" });

    expect(result.name).toBe("session1");
    expect(result.status).toBe("STARTING");
    expect(mockCreateSession).toHaveBeenCalled();
  });
});

describe("waha.getQRCode", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.getQRCode({ sessionName: "session1" })
    ).rejects.toThrow(TRPCError);
  });

  it("retorna o QR Code da sessão", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.getQRCode({ sessionName: "session1" });

    expect(result.qrCode).toBe("data:image/png;base64,xxx");
    expect(mockGetQRCode).toHaveBeenCalledWith("session1");
  });
});

describe("waha.disconnectSession", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.disconnectSession({ sessionName: "session1" })
    ).rejects.toThrow(TRPCError);
  });

  it("desconecta sessão com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.disconnectSession({
      sessionName: "session1",
    });

    expect(result).toEqual({ success: true });
    expect(mockDisconnectSession).toHaveBeenCalledWith("session1");
  });
});

describe("waha.deleteSession", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.deleteSession({ sessionName: "session1" })
    ).rejects.toThrow(TRPCError);
  });

  it("deleta sessão com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.deleteSession({
      sessionName: "session1",
    });

    expect(result).toEqual({ success: true });
    expect(mockDeleteSession).toHaveBeenCalledWith("session1");
  });
});

describe("waha.sendMessage", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.sendMessage({
        sessionName: "session1",
        chatId: "5511999999999@c.us",
        text: "Olá",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("envia mensagem de texto com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.sendMessage({
      sessionName: "session1",
      chatId: "5511999999999@c.us",
      text: "Olá",
    });

    expect(result.id).toBe("msg-1");
    expect(mockSendMessage).toHaveBeenCalledWith(
      "session1",
      "5511999999999@c.us",
      "Olá"
    );
  });

  it("rejeita quando campos obrigatórios estão faltando", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.sendMessage({
        sessionName: "session1",
      } as any)
    ).rejects.toThrow();
  });
});

describe("waha.sendMedia", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.sendMedia({
        sessionName: "session1",
        chatId: "5511999999999@c.us",
        mediaUrl: "https://example.com/img.jpg",
        mediaType: "image",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("envia mídia com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.sendMedia({
      sessionName: "session1",
      chatId: "5511999999999@c.us",
      mediaUrl: "https://example.com/img.jpg",
      mediaType: "image",
      caption: "Veja esta imagem",
    });

    expect(result.id).toBe("msg-2");
    expect(mockSendMediaMessage).toHaveBeenCalledWith(
      "session1",
      "5511999999999@c.us",
      "https://example.com/img.jpg",
      "image",
      "Veja esta imagem"
    );
  });
});

describe("waha.sendLocation", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.sendLocation({
        sessionName: "session1",
        chatId: "5511999999999@c.us",
        latitude: -23.5505,
        longitude: -46.6333,
      })
    ).rejects.toThrow(TRPCError);
  });

  it("envia localização com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.sendLocation({
      sessionName: "session1",
      chatId: "5511999999999@c.us",
      latitude: -23.5505,
      longitude: -46.6333,
      name: "São Paulo",
    });

    expect(result.id).toBe("msg-3");
    expect(mockSendLocationMessage).toHaveBeenCalledWith(
      "session1",
      "5511999999999@c.us",
      -23.5505,
      -46.6333,
      "São Paulo"
    );
  });
});

describe("waha.getMessages", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.getMessages({
        sessionName: "session1",
        chatId: "5511999999999@c.us",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("retorna mensagens de um chat", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.getMessages({
      sessionName: "session1",
      chatId: "5511999999999@c.us",
      limit: 50,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(mockGetMessages).toHaveBeenCalledWith(
      "session1",
      "5511999999999@c.us",
      50
    );
  });
});

describe("waha.registerWebhook", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.registerWebhook({
        sessionName: "session1",
        webhookUrl: "https://example.com/webhook",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("registra webhook com sucesso", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.registerWebhook({
      sessionName: "session1",
      webhookUrl: "https://example.com/webhook",
    });

    expect(result).toEqual({});
    expect(mockRegisterWebhook).toHaveBeenCalledWith(
      "session1",
      "https://example.com/webhook"
    );
  });
});

describe("waha.listWebhooks", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waha.listWebhooks({ sessionName: "session1" })
    ).rejects.toThrow(TRPCError);
  });

  it("lista webhooks configurados para uma sessão", async () => {
    mockListWebhooks.mockResolvedValue([
      { url: "https://example.com/webhook", events: ["message.any"] },
    ]);

    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.listWebhooks({ sessionName: "session1" });

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/webhook");
  });
});

describe("waha.getWebhookUrl", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.waha.getWebhookUrl()).rejects.toThrow(TRPCError);
  });

  it("retorna a URL do webhook configurado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waha.getWebhookUrl();

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("events");
    expect(result.url).toContain("/api/waha/webhook");
  });
});
