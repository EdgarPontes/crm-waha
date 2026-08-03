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

const mockWahaClient = {
  createSession: vi.fn(async () => ({ name: "test-session" })),
  getSession: vi.fn(async () => ({ name: "test-session", status: "connected" })),
  getQRCode: vi.fn(async () => "data:image/png;base64,xxx"),
  startSession: vi.fn(async () => ({})),
  disconnectSession: vi.fn(async () => ({})),
  sendMessage: vi.fn(async () => ({ id: "msg-1" })),
  sendMediaMessage: vi.fn(async () => ({ id: "msg-2" })),
  sendLocationMessage: vi.fn(async () => ({ id: "msg-3" })),
};

vi.mock("./waha-client", () => ({
  getWAHAClient: vi.fn(async () => mockWahaClient),
}));

const mockSession = {
  id: 1,
  sessionName: "test-session",
  status: "connected" as const,
  qrCode: null as string | null,
  phoneNumber: null as string | null,
  lastErrorMessage: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDb = {
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoUpdate: vi.fn(async () => undefined),
    })),
  })),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
  })),
};

vi.mock("./db", () => ({
  listWhatsAppSessions: vi.fn(async () => [mockSession]),
  getWhatsAppSessionByName: vi.fn(async () => mockSession),
  updateWhatsAppSessionStatus: vi.fn(async () => ({ success: true })),
  updateWhatsAppSessionByName: vi.fn(async () => ({ success: true })),
  getDb: vi.fn(async () => mockDb),
  createAuditLog: vi.fn(async () => null),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sessions.list", () => {
  it("returns list of sessions for authenticated user", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.sessions.list();

    expect(result).toHaveLength(1);
    expect(result[0]!.sessionName).toBe("test-session");
  });

  it("rejects unauthenticated user", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.whatsapp.sessions.list()).rejects.toThrow(TRPCError);
  });
});

describe("sessions.get", () => {
  it("returns session by name for authenticated user", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.sessions.get({ sessionName: "test-session" });

    expect(result.sessionName).toBe("test-session");
  });

  it("rejects unauthenticated user", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.get({ sessionName: "test-session" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("sessions.create", () => {
  it("admin can create a session", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.sessions.create({ sessionName: "new-session" });

    expect(mockWahaClient.createSession).toHaveBeenCalled();
    expect(result).toEqual(mockSession);
  });

  it("rejects Supervisor (non-admin)", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.create({ sessionName: "test-session" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejects Atendente (non-admin)", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.create({ sessionName: "test-session" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejects unauthenticated user", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.create({ sessionName: "test-session" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("sessions.updateStatus", () => {
  it("admin can update session status", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.sessions.updateStatus({
      sessionId: 1,
      status: "connected",
      phoneNumber: "5511999999999",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects invalid status value (Zod validation)", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.updateStatus({
        sessionId: 1,
        status: "invalid-status" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects Supervisor (non-admin)", async () => {
    const ctx = makeContext(makeUser({ id: 2, role: "Supervisor" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.updateStatus({ sessionId: 1, status: "connected" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("sessions.getQR", () => {
  it("returns QR code for authenticated user", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.sessions.getQR({ sessionName: "test-session" });

    expect(result.sessionName).toBe("test-session");
    expect(result.qrCode).toBe("data:image/png;base64,xxx");
    expect(result.status).toBe("connecting");
    expect(mockWahaClient.getQRCode).toHaveBeenCalledWith("test-session");
  });

  it("rejects unauthenticated user", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.getQR({ sessionName: "test-session" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("sessions.disconnect", () => {
  it("admin can disconnect a session", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.sessions.disconnect({ sessionName: "test-session" });

    expect(mockWahaClient.disconnectSession).toHaveBeenCalledWith("test-session");
    expect(result).toEqual(mockSession);
  });

  it("rejects Atendente (non-admin)", async () => {
    const ctx = makeContext(makeUser({ id: 3, role: "Atendente" }));
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sessions.disconnect({ sessionName: "test-session" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("messages.sendText", () => {
  it("authenticated user can send text message", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.messages.sendText({
      sessionName: "test-session",
      phoneNumber: "5511999999999",
      text: "Hello!",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.phoneNumber).toBe("5511999999999");
    expect(mockWahaClient.sendMessage).toHaveBeenCalledWith(
      "test-session",
      "5511999999999@c.us",
      "Hello!"
    );
  });

  it("rejects unauthenticated user", async () => {
    const ctx = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.messages.sendText({
        sessionName: "test-session",
        phoneNumber: "5511999999999",
        text: "Hello!",
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("messages.sendMedia", () => {
  it("authenticated user can send media message", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.messages.sendMedia({
      sessionName: "test-session",
      phoneNumber: "5511999999999",
      mediaUrl: "https://example.com/image.png",
      mediaType: "image",
      caption: "Check this out",
    });

    expect(result.success).toBe(true);
    expect(result.mediaType).toBe("image");
    expect(mockWahaClient.sendMediaMessage).toHaveBeenCalledWith(
      "test-session",
      "5511999999999@c.us",
      "https://example.com/image.png",
      "image",
      "Check this out"
    );
  });
});

describe("messages.sendLocation", () => {
  it("authenticated user can send location message", async () => {
    const ctx = makeContext(makeUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whatsapp.messages.sendLocation({
      sessionName: "test-session",
      phoneNumber: "5511999999999",
      latitude: -23.5505,
      longitude: -46.6333,
    });

    expect(result.success).toBe(true);
    expect(result.latitude).toBe(-23.5505);
    expect(result.longitude).toBe(-46.6333);
    expect(mockWahaClient.sendLocationMessage).toHaveBeenCalledWith(
      "test-session",
      "5511999999999@c.us",
      -23.5505,
      -46.6333,
      undefined
    );
  });
});
