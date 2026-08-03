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

const mockKBState = vi.hoisted(() => ({
  documents: [] as Array<{
    id: number;
    fileName: string;
    fileType: string;
    fileUrl: string;
    content?: string;
    embedding?: string;
    chunkIndex?: number;
    totalChunks?: number;
    uploadedBy?: number;
  }>,
}));

const mockActiveConfig = vi.hoisted(() => ({
  provider: "openai",
  apiKey: "sk-test-123",
  model: "gpt-4",
  systemPrompt: "You are helpful",
  temperature: 0.7,
  maxTokens: 2000,
  isActive: true,
}));

const {
  mockGetActiveAIConfiguration,
  mockGetAIConfigurationByProvider,
} = vi.hoisted(() => ({
  mockGetActiveAIConfiguration: vi.fn(),
  mockGetAIConfigurationByProvider: vi.fn(),
}));

const { mockSetConfig, mockTestConnection, mockGetConfig, mockGenerateResponse, mockDetectHandoff, mockBuildContextPrompt } =
  vi.hoisted(() => ({
    mockSetConfig: vi.fn(),
    mockTestConnection: vi.fn(),
    mockGetConfig: vi.fn(),
    mockGenerateResponse: vi.fn(),
    mockDetectHandoff: vi.fn(),
    mockBuildContextPrompt: vi.fn(),
  }));

const { mockSearchSimilar, mockProcessDocument } = vi.hoisted(() => ({
  mockSearchSimilar: vi.fn(),
  mockProcessDocument: vi.fn(),
}));

const mockCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getActiveAIConfiguration: mockGetActiveAIConfiguration,
    getAIConfigurationByProvider: mockGetAIConfigurationByProvider,
    createAuditLog: mockCreateAuditLog,
    getConversationById: vi.fn(async (id: number) => {
      if (id === 1) return { id: 1, contactId: 1, leadId: 1 };
      return null;
    }),
    getContactById: vi.fn(async () => ({
      id: 1,
      name: "Test Contact",
      whatsappNumber: "5511999999999",
    })),
    getLeadById: vi.fn(async () => ({ id: 1, stageId: 1 })),
    getDefaultPipeline: vi.fn(async () => ({ id: 1, name: "Default Pipeline" })),
    getStagesByPipeline: vi.fn(async () => [{ id: 1, name: "Prospecting" }]),
    createMessage: vi.fn(async () => ({ id: 99 })),
    listKnowledgeBaseDocuments: vi.fn(async () => mockKBState.documents),
    createKnowledgeBaseDocument: vi.fn(async (data: any) => {
      const doc = { id: mockKBState.documents.length + 1, ...data };
      mockKBState.documents.push(doc);
      return doc;
    }),
    deleteKnowledgeBaseDocument: vi.fn(async (id: number) => {
      const idx = mockKBState.documents.findIndex((d) => d.id === id);
      if (idx >= 0) mockKBState.documents.splice(idx, 1);
    }),
  };
});

vi.mock("./services/ai", () => ({
  aiService: {
    setConfig: mockSetConfig,
    testConnection: mockTestConnection,
    getConfig: mockGetConfig,
    generateResponse: mockGenerateResponse,
    detectHandoff: mockDetectHandoff,
    buildContextPrompt: mockBuildContextPrompt,
  },
}));

vi.mock("./services/rag", () => ({
  createRAGService: vi.fn(() => ({
    searchSimilar: mockSearchSimilar,
    processDocument: mockProcessDocument,
  })),
}));

beforeEach(() => {
  mockKBState.documents = [];
  vi.clearAllMocks();

  mockGetActiveAIConfiguration.mockResolvedValue(mockActiveConfig);
  mockGetAIConfigurationByProvider.mockImplementation(async (provider: string) => {
    if (provider === "openai") return mockActiveConfig;
    return null;
  });
  mockSetConfig.mockResolvedValue(undefined);
  mockTestConnection.mockResolvedValue({ success: true, message: "Conexão OK" });
  mockGetConfig.mockResolvedValue({ provider: "openai", model: "gpt-4" });
  mockGenerateResponse.mockResolvedValue({ content: "AI response text" });
  mockDetectHandoff.mockResolvedValue({ shouldHandoff: false });
  mockBuildContextPrompt.mockReturnValue("");
  mockSearchSimilar.mockResolvedValue([
    { id: 1, content: "relevant context", similarity: 0.95 },
  ]);
  mockProcessDocument.mockResolvedValue([
    { embedding: [0.1, 0.2, 0.3], chunkIndex: 0, totalChunks: 1, content: "test" },
  ]);
  mockCreateAuditLog.mockResolvedValue(null);
});

// =============================================================================
// config
// =============================================================================

describe("ai.config.getActive", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.config.getActive()).rejects.toThrow(TRPCError);
  });

  it("retorna configuração ativa para usuário autenticado", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.config.getActive();

    expect(result).toEqual(mockActiveConfig);
  });
});

describe("ai.config.getByProvider", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.config.getByProvider({ provider: "openai" })
    ).rejects.toThrow(TRPCError);
  });

  it("retorna configuração por provider", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.config.getByProvider({ provider: "openai" });

    expect(result).toEqual(mockActiveConfig);
    expect(mockGetAIConfigurationByProvider).toHaveBeenCalledWith("openai");
  });
});

describe("ai.config.update", () => {
  const updateInput = {
    provider: "openai" as const,
    apiKey: "sk-new-key",
    model: "gpt-4-turbo",
    isActive: true,
  };

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.config.update(updateInput)).rejects.toThrow(TRPCError);
  });

  it("rejeita não-admin", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.config.update(updateInput)).rejects.toThrow(TRPCError);
  });

  it("admin pode atualizar configuração", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.config.update(updateInput);

    expect(result).toEqual({
      provider: "openai",
      model: "gpt-4-turbo",
      isActive: true,
    });
    expect(mockSetConfig).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      ctx.user!.id,
      "update",
      "ai_config",
      undefined,
      { provider: "openai" }
    );
  });
});

describe("ai.config.testConnection", () => {
  const testInput = {
    provider: "openai" as const,
    apiKey: "sk-test",
    model: "gpt-4",
  };

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.config.testConnection(testInput)).rejects.toThrow(TRPCError);
  });

  it("rejeita não-admin", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.config.testConnection(testInput)).rejects.toThrow(TRPCError);
  });

  it("admin pode testar conexão", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.config.testConnection(testInput);

    expect(result).toEqual({ success: true, message: "Conexão OK" });
    expect(mockTestConnection).toHaveBeenCalled();
  });
});

describe("ai.config.listConfigs", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.config.listConfigs()).rejects.toThrow(TRPCError);
  });

  it("rejeita não-admin", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.config.listConfigs()).rejects.toThrow(TRPCError);
  });

  it("admin pode listar configurações", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.config.listConfigs();

    expect(Array.isArray(result)).toBe(true);
    expect(mockGetConfig).toHaveBeenCalledTimes(5);
  });
});

// =============================================================================
// chat
// =============================================================================

describe("ai.chat.complete", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.chat.complete({
        conversationId: 1,
        messages: [{ role: "user", content: "Olá" }],
      })
    ).rejects.toThrow(TRPCError);
  });

  it("gera resposta da IA e salva mensagem", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat.complete({
      conversationId: 1,
      messages: [{ role: "user", content: "Olá" }],
      systemPrompt: "Seja conciso",
    });

    expect(result.conversationId).toBe(1);
    expect(result.response).toBe("AI response text");
    expect(result.messageId).toBe(99);
    expect(mockGenerateResponse).toHaveBeenCalled();
  });

  it("lança erro se não houver configuração ativa", async () => {
    mockGetActiveAIConfiguration.mockResolvedValueOnce(null);
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.chat.complete({
        conversationId: 1,
        messages: [{ role: "user", content: "Olá" }],
      })
    ).rejects.toThrow(/configuração de IA ativa/i);
  });
});

describe("ai.chat.checkHandoff", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.chat.checkHandoff({ message: "Olá" })
    ).rejects.toThrow(TRPCError);
  });

  it("não detecta handoff em mensagem normal", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat.checkHandoff({ message: "Olá, quero comprar" });

    expect(result).toEqual({ shouldHandoff: false });
  });

  it("detecta handoff em mensagem de reclamação", async () => {
    mockDetectHandoff.mockResolvedValueOnce({
      shouldHandoff: true,
      reason: 'Palavra-chave detectada: "quero falar com atendente"',
    });
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat.checkHandoff({
      message: "quero falar com atendente humano",
    });

    expect(result.shouldHandoff).toBe(true);
    expect(result.reason).toContain("atendente");
  });
});

// =============================================================================
// knowledgeBase
// =============================================================================

describe("ai.knowledgeBase.search", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.knowledgeBase.search({ query: "test" })
    ).rejects.toThrow(TRPCError);
  });

  it("busca similar e retorna resultados", async () => {
    mockKBState.documents = [
      {
        id: 1,
        fileName: "doc.pdf",
        fileType: "pdf",
        fileUrl: "https://example.com/doc.pdf",
        content: "Document content",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
      },
    ];
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.knowledgeBase.search({ query: "test", limit: 3 });

    expect(result.query).toBe("test");
    expect(result.count).toBe(1);
    expect(mockSearchSimilar).toHaveBeenCalled();
  });

  it("retorna vazio se não houver documentos com embedding", async () => {
    mockKBState.documents = [
      {
        id: 1,
        fileName: "doc.txt",
        fileType: "txt",
        fileUrl: "https://example.com/doc.txt",
        content: "Plain text",
      },
    ];
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.knowledgeBase.search({ query: "test" });

    expect(result.results).toHaveLength(0);
    expect(result.count).toBe(0);
  });
});

describe("ai.knowledgeBase.upload", () => {
  const uploadInput = {
    fileName: "manual.pdf",
    fileType: "pdf" as const,
    fileUrl: "https://example.com/manual.pdf",
    content: "Manual content",
  };

  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.knowledgeBase.upload(uploadInput)).rejects.toThrow(TRPCError);
  });

  it("faz upload de documento e processa embeddings", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.knowledgeBase.upload(uploadInput);

    expect(result).toBeDefined();
    expect(result.fileName).toBe("manual.pdf");
    expect(mockProcessDocument).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      ctx.user!.id,
      "create",
      "knowledge_base",
      result.id,
      { fileName: "manual.pdf" }
    );
  });

  it("faz upload sem processar embeddings se não houver config ativa", async () => {
    mockGetActiveAIConfiguration.mockResolvedValueOnce(null);
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.knowledgeBase.upload({
      fileName: "notes.txt",
      fileType: "txt",
      fileUrl: "https://example.com/notes.txt",
    });

    expect(result).toBeDefined();
    expect(result.fileName).toBe("notes.txt");
    expect(mockProcessDocument).not.toHaveBeenCalled();
  });
});

describe("ai.knowledgeBase.list", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.knowledgeBase.list()).rejects.toThrow(TRPCError);
  });

  it("lista documentos", async () => {
    mockKBState.documents = [
      {
        id: 1,
        fileName: "doc1.pdf",
        fileType: "pdf",
        fileUrl: "https://example.com/doc1.pdf",
        content: "Content 1",
      },
      {
        id: 2,
        fileName: "doc2.txt",
        fileType: "txt",
        fileUrl: "https://example.com/doc2.txt",
        content: "Content 2",
      },
    ];
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.knowledgeBase.list();

    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe("doc1.pdf");
  });
});

describe("ai.knowledgeBase.delete", () => {
  it("rejeita usuário não autenticado", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.knowledgeBase.delete({ id: 1 })).rejects.toThrow(TRPCError);
  });

  it("deleta documento", async () => {
    mockKBState.documents = [
      {
        id: 1,
        fileName: "doc1.pdf",
        fileType: "pdf",
        fileUrl: "https://example.com/doc1.pdf",
      },
      {
        id: 2,
        fileName: "doc2.txt",
        fileType: "txt",
        fileUrl: "https://example.com/doc2.txt",
      },
    ];
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.knowledgeBase.delete({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(mockKBState.documents).toHaveLength(1);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      ctx.user!.id,
      "delete",
      "knowledge_base",
      1,
      {}
    );
  });
});
