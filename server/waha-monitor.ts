import { getWAHAClient } from "./waha-client";
import {
  listWhatsAppSessions,
  updateWhatsAppSessionByName,
  getWhatsAppSessionsByStatus,
} from "./db";

const MONITOR_INTERVAL = 60000;
const RECONNECT_INTERVAL = 300000;

let monitorTimer: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

export function startSessionMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
  }
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
  }

  monitorTimer = setInterval(async () => {
    await syncSessionStatuses();
  }, MONITOR_INTERVAL);

  reconnectTimer = setInterval(async () => {
    await reconnectSessions();
  }, RECONNECT_INTERVAL);

  syncSessionStatuses().catch(console.error);

  console.log(
    `[WAHA Monitor] Session monitor started (sync interval: ${MONITOR_INTERVAL}ms, reconnect interval: ${RECONNECT_INTERVAL}ms)`
  );
}

export function stopSessionMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  console.log("[WAHA Monitor] Session monitor stopped");
}

async function syncSessionStatuses() {
  try {
    const dbSessions = await listWhatsAppSessions();
    if (!dbSessions || dbSessions.length === 0) {
      return;
    }

    const wahaClient = await getWAHAClient();
    let wahaSessions: any[] = [];
    try {
      wahaSessions = await wahaClient.listSessions();
    } catch (error) {
      console.warn(
        "[WAHA Monitor] Could not fetch sessions from WAHA API:",
        error
      );
      return;
    }

    const wahaSessionMap = new Map<string, any>();
    for (const ws of wahaSessions) {
      wahaSessionMap.set(ws.sessionName, ws);
    }

    for (const dbSession of dbSessions) {
      const wahaSession = wahaSessionMap.get(dbSession.sessionName);
      if (!wahaSession) {
        if (dbSession.status !== "disconnected") {
          await updateWhatsAppSessionByName(dbSession.sessionName, {
            status: "disconnected",
            lastErrorMessage: "Session not found in WAHA",
          });
        }
        continue;
      }

      const statusMap: Record<string, string> = {
        CONNECTED: "connected",
        DISCONNECTED: "disconnected",
        STARTING: "connecting",
        STOPPING: "disconnected",
        FAILED: "error",
        ERROR: "error",
      };

      const mappedStatus =
        statusMap[wahaSession.status?.toUpperCase() || ""] ||
        "disconnected";

      if (dbSession.status !== mappedStatus) {
        const phoneNumber = wahaSession.me?.id
          ? wahaSession.me.id.replace(/\D/g, "").substring(0, 20)
          : undefined;

        await updateWhatsAppSessionByName(dbSession.sessionName, {
          status: mappedStatus,
          phoneNumber,
          lastErrorMessage: undefined,
        });

        console.log(
          `[WAHA Monitor] Session ${dbSession.sessionName} status: ${dbSession.status} -> ${mappedStatus}`
        );
      }
    }
  } catch (error) {
    console.error("[WAHA Monitor] Error syncing session statuses:", error);
  }
}

async function reconnectSessions() {
  try {
    const disconnectedSessions = await getWhatsAppSessionsByStatus(
      "disconnected"
    );

    if (!disconnectedSessions || disconnectedSessions.length === 0) {
      return;
    }

    const wahaClient = await getWAHAClient();

    for (const session of disconnectedSessions) {
      try {
        console.log(
          `[WAHA Monitor] Attempting to reconnect session: ${session.sessionName}`
        );

        await wahaClient.createSession(session.sessionName);

        await updateWhatsAppSessionByName(session.sessionName, {
          status: "connecting",
          lastErrorMessage: undefined,
        });

        console.log(
          `[WAHA Monitor] Reconnection initiated for session: ${session.sessionName}`
        );
      } catch (error) {
        console.error(
          `[WAHA Monitor] Failed to reconnect session ${session.sessionName}:`,
          error
        );

        await updateWhatsAppSessionByName(session.sessionName, {
          lastErrorMessage:
            error instanceof Error ? error.message : "Reconnection failed",
        });
      }
    }

    const errorSessions = await getWhatsAppSessionsByStatus("error");
    for (const session of errorSessions) {
      try {
        console.log(
          `[WAHA Monitor] Attempting to recover error session: ${session.sessionName}`
        );

        await wahaClient.deleteSession(session.sessionName);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await wahaClient.createSession(session.sessionName);

        await updateWhatsAppSessionByName(session.sessionName, {
          status: "connecting",
          lastErrorMessage: undefined,
        });

        console.log(
          `[WAHA Monitor] Recovery initiated for session: ${session.sessionName}`
        );
      } catch (error) {
        console.error(
          `[WAHA Monitor] Failed to recover error session ${session.sessionName}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[WAHA Monitor] Error during reconnection cycle:", error);
  }
}

export async function registerWahaWebhook(sessionName: string, webhookUrl: string) {
  try {
    const wahaClient = await getWAHAClient();
    await wahaClient.registerWebhook(sessionName, webhookUrl, [
      "message",
      "message.received",
      "message.ack",
      "message.status",
      "session.status",
    ]);
    console.log(
      `[WAHA Monitor] Webhook registered for session ${sessionName} -> ${webhookUrl}`
    );
    return true;
  } catch (error) {
    console.error(
      `[WAHA Monitor] Failed to register webhook for session ${sessionName}:`,
      error
    );
    return false;
  }
}

export async function registerWebhooksForAllSessions(webhookBaseUrl: string) {
  try {
    const sessions = await listWhatsAppSessions();
    if (!sessions) return;

    const webhookUrl = `${webhookBaseUrl}/api/waha/webhook`;

    for (const session of sessions) {
      await registerWahaWebhook(session.sessionName, webhookUrl);
    }

    console.log(
      `[WAHA Monitor] Registered webhooks for ${sessions.length} sessions`
    );
  } catch (error) {
    console.error("[WAHA Monitor] Error registering webhooks:", error);
  }
}
