import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleWahaWebhook } from "../waha-webhook";
import { startSessionMonitor, registerWebhooksForAllSessions } from "../waha-monitor";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json());

  // WAHA Webhook endpoint
  app.post("/api/waha/webhook", handleWahaWebhook);

  const server = createServer(app);

  // tRPC API - MUST be registered BEFORE other middlewares in development
  // tRPC v11 handles its own body parsing for JSON requests
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Start WAHA session monitor
    startSessionMonitor();

    // Register webhooks for all sessions after a short delay
    setTimeout(async () => {
      const webhookBaseUrl = process.env.WAHA_WEBHOOK_URL || `http://localhost:${port}`;
      await registerWebhooksForAllSessions(webhookBaseUrl);
    }, 5000);
  });
}

startServer().catch(console.error);