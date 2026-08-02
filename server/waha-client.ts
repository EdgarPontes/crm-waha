import axios, { AxiosInstance } from "axios";

interface WAHAConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
}

interface SessionInfo {
  sessionName: string;
  status: "CONNECTED" | "DISCONNECTED" | "STARTING" | "STOPPING";
  me?: {
    id: string;
    pushName: string;
  };
  qr?: string;
}

interface MessagePayload {
  chatId: string;
  text?: string;
  media?: {
    url: string;
    type: "image" | "video" | "audio" | "document";
  };
}

interface WebhookEvent {
  event: string;
  data: any;
  timestamp: number;
}

export class WAHAClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(config: WAHAConfig) {
    this.baseURL = config.baseURL;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: config.apiKey
        ? { "X-Api-Key": config.apiKey }
        : {},
    });
  }

  /**
   * Listar todas as sessões
   */
  async listSessions(): Promise<SessionInfo[]> {
    try {
      const response = await this.client.get("/api/sessions?all=true");
      const rawSessions = response.data.sessions || response.data || [];
      const list = Array.isArray(rawSessions) ? rawSessions : [];
      return list.map((s: any) => ({
        ...s,
        sessionName: s.name || s.sessionName || s.id,
      }));
    } catch (error) {
      console.error("[WAHA] Erro ao listar sessões:", error);
      throw error;
    }
  }

  /**
   * Obter informações de uma sessão específica
   */
  async getSession(sessionName: string): Promise<SessionInfo> {
    try {
      const response = await this.client.get(`/api/sessions/${sessionName}`);
      const data = response.data;
      return {
        ...data,
        sessionName: data?.name || data?.sessionName || sessionName,
      };
    } catch (error) {
      console.error(`[WAHA] Erro ao obter sessão ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Criar uma nova sessão
   */
  async createSession(sessionName: string, webhookUrl?: string): Promise<SessionInfo> {
    const payload: any = {
      name: sessionName,
      start: true,
      config: {
        webhooks: webhookUrl
          ? [
              {
                url: webhookUrl,
                events: ["message.any"],
              },
            ]
          : [],
      },
    };

    try {
      const response = await this.client.post("/api/sessions", payload);
      const data = response.data;
      return {
        ...data,
        sessionName: data?.name || data?.sessionName || sessionName,
      };
    } catch (error: any) {
      if (error?.response?.status === 422 || error?.response?.data?.statusCode === 422) {
        console.log(`[WAHA] Sessão "${sessionName}" já existe no WAHA. Atualizando via PUT se necessário...`);
        if (webhookUrl) {
          try {
            await this.registerWebhook(sessionName, webhookUrl);
          } catch {
            // Ignora falha de webhook no fallback
          }
        }
        try {
          return await this.startSession(sessionName);
        } catch {
          return await this.getSession(sessionName);
        }
      }
      console.error(`[WAHA] Erro ao criar sessão ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Obter QR Code para conectar uma sessão
   */
  async getQRCode(sessionName: string): Promise<string> {
    // 1. Tenta GET /api/{session}/auth/qr?format=image (Swagger WAHA: retorna imagem PNG direta)
    try {
      const response = await this.client.get(
        `/api/${sessionName}/auth/qr?format=image`,
        { responseType: "arraybuffer" }
      );
      if (response.status === 200 && response.data) {
        const base64 = Buffer.from(response.data).toString("base64");
        return `data:image/png;base64,${base64}`;
      }
    } catch {
      // Ignora erro e tenta o próximo formato
    }

    // 2. Tenta GET /api/{session}/auth/qr (formato raw ou JSON)
    try {
      const response = await this.client.get(`/api/${sessionName}/auth/qr`);
      const data = response.data;
      if (typeof data === "string" && data.trim()) {
        if (data.startsWith("data:image/") || data.startsWith("http")) return data;
        return data;
      }
      const qr = data?.qr || data?.value || data?.raw || data?.image || data?.qrCode;
      if (typeof qr === "string" && qr.trim()) {
        if (qr.startsWith("data:image/") || qr.startsWith("http")) return qr;
        return qr;
      }
    } catch {
      // Ignora
    }

    // 3. Tenta GET /api/sessions/{session}/auth/qr?format=image (rota com /sessions/)
    try {
      const response = await this.client.get(
        `/api/sessions/${sessionName}/auth/qr?format=image`,
        { responseType: "arraybuffer" }
      );
      if (response.status === 200 && response.data) {
        const base64 = Buffer.from(response.data).toString("base64");
        return `data:image/png;base64,${base64}`;
      }
    } catch {
      // Ignora
    }

    // 4. Tenta obter do objeto da própria sessão GET /api/sessions/{sessionName}
    try {
      const response = await this.client.get(`/api/sessions/${sessionName}`);
      const data = response.data;
      const qr = data?.qr || data?.qrCode || data?.auth?.qr || data?.auth?.raw;
      if (typeof qr === "string" && qr.trim()) return qr;
      if (qr?.image) return qr.image;
      if (qr?.raw) return qr.raw;
    } catch {
      // Ignora
    }

    return "";
  }

  /**
   * Desconectar uma sessão
   */
  async disconnectSession(sessionName: string): Promise<void> {
    try {
      await this.client.post(`/api/sessions/${sessionName}/logout`);
    } catch (error) {
      console.error(`[WAHA] Erro ao desconectar sessão ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Deletar uma sessão
   */
  async deleteSession(sessionName: string): Promise<void> {
    try {
      await this.client.delete(`/api/sessions/${sessionName}`);
    } catch (error) {
      console.error(`[WAHA] Erro ao deletar sessão ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Enviar mensagem de texto
   */
  async sendMessage(
    sessionName: string,
    chatId: string,
    text: string
  ): Promise<any> {
    try {
      const response = await this.client.post(
        `/api/sessions/${sessionName}/messages`,
        {
          chatId,
          text,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao enviar mensagem:`, error);
      throw error;
    }
  }

  /**
   * Enviar mensagem com mídia
   */
  async sendMediaMessage(
    sessionName: string,
    chatId: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "audio" | "document",
    caption?: string
  ): Promise<any> {
    try {
      const response = await this.client.post(
        `/api/sessions/${sessionName}/messages`,
        {
          chatId,
          media: {
            url: mediaUrl,
            type: mediaType,
          },
          caption,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao enviar mídia:`, error);
      throw error;
    }
  }

  /**
   * Enviar mensagem de localização
   */
  async sendLocationMessage(
    sessionName: string,
    chatId: string,
    latitude: number,
    longitude: number,
    name?: string
  ): Promise<any> {
    try {
      const response = await this.client.post(
        `/api/sessions/${sessionName}/messages`,
        {
          chatId,
          location: {
            latitude,
            longitude,
            name,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao enviar localização:`, error);
      throw error;
    }
  }

  /**
   * Iniciar/reconectar uma sessão
   */
  async startSession(sessionName: string): Promise<SessionInfo> {
    try {
      let response;
      try {
        response = await this.client.post(`/api/sessions/${sessionName}/start`);
      } catch {
        try {
          response = await this.client.post(`/api/${sessionName}/start`);
        } catch {
          response = await this.client.post("/api/sessions/start", {
            name: sessionName,
            sessionName,
          });
        }
      }
      const data = response.data;
      return {
        ...data,
        sessionName: data?.name || data?.sessionName || sessionName,
      };
    } catch (error) {
      console.warn(`[WAHA] Erro ao iniciar sessão ${sessionName}, buscando status atual:`, error);
      return await this.getSession(sessionName);
    }
  }

  /**
   * Obter status de todas as sessões de uma vez
   */
  async getSessionsStatus(): Promise<any> {
    try {
      const response = await this.client.get("/api/sessions/status");
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao obter status das sessões:`, error);
      throw error;
    }
  }

  /**
   * Obter histórico de mensagens de um chat
   */
  async getMessages(
    sessionName: string,
    chatId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/api/sessions/${sessionName}/chats/${chatId}/messages`,
        {
          params: { limit },
        }
      );
      return response.data.messages || [];
    } catch (error) {
      console.error(`[WAHA] Erro ao obter mensagens:`, error);
      throw error;
    }
  }

  /**
   * Marcar mensagem como lida
   */
  async markAsRead(sessionName: string, messageId: string): Promise<void> {
    try {
      await this.client.post(
        `/api/sessions/${sessionName}/messages/${messageId}/read`
      );
    } catch (error) {
      console.error(`[WAHA] Erro ao marcar mensagem como lida:`, error);
      throw error;
    }
  }

  /**
   * Obter informações de um contato
   */
  async getContact(sessionName: string, contactId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/api/sessions/${sessionName}/contacts/${contactId}`
      );
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao obter contato:`, error);
      throw error;
    }
  }

  /**
   * Listar webhooks configurados para uma sessão
   */
  async listWebhooks(sessionName: string): Promise<any[]> {
    // 1. Tenta GET /api/sessions/{session}/webhooks
    try {
      const response = await this.client.get(`/api/sessions/${sessionName}/webhooks`);
      const data = response.data;
      const webhooks = Array.isArray(data) ? data : data?.webhooks || [];
      if (webhooks.length > 0) return webhooks;
    } catch {
      // Tenta próximo
    }

    // 2. Tenta GET /api/{session}/webhooks
    try {
      const response = await this.client.get(`/api/${sessionName}/webhooks`);
      const data = response.data;
      const webhooks = Array.isArray(data) ? data : data?.webhooks || [];
      if (webhooks.length > 0) return webhooks;
    } catch {
      // Tenta próximo
    }

    // 3. Tenta GET /api/webhooks (global)
    try {
      const response = await this.client.get("/api/webhooks");
      const data = response.data;
      const webhooks = Array.isArray(data) ? data : data?.webhooks || [];
      if (webhooks.length > 0) return webhooks;
    } catch {
      // Tenta próximo
    }

    // 4. Tenta obter da própria sessão (config.webhooks)
    try {
      const response = await this.client.get(`/api/sessions/${sessionName}`);
      const data = response.data;
      const webhooks = data?.config?.webhooks || data?.webhooks || [];
      if (Array.isArray(webhooks) && webhooks.length > 0) return webhooks;
    } catch {
      // Ignora
    }

    return [];
  }

  /**
   * Registrar webhook para receber eventos (Swagger WAHA: POST /api/webhooks ou PATCH /api/sessions/{session})
   */
  async registerWebhook(
    sessionName: string,
    webhookUrl: string,
    events: string[] = [
      "message.any"
    ]
  ): Promise<any> {
    // 1. Tenta PUT /api/sessions/{session} (Método oficial do Swagger conforme SessionCreateRequest / Update)
    try {
      const response = await this.client.put(`/api/sessions/${sessionName}`, {
        name: sessionName,
        config: {
          webhooks: [
            {
              url: webhookUrl,
              events,
            },
          ],
        },
      });
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      }
    } catch {
      // Tenta próximo
    }

    // 2. Tenta PATCH /api/sessions/{session}
    try {
      const response = await this.client.patch(`/api/sessions/${sessionName}`, {
        config: {
          webhooks: [
            {
              url: webhookUrl,
              events,
            },
          ],
        },
      });
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      }
    } catch {
      // Tenta próximo
    }

    // 3. Tenta POST /api/webhooks (Global Webhooks no Swagger WAHA)
    try {
      const response = await this.client.post("/api/webhooks", {
        url: webhookUrl,
        events,
        session: sessionName,
      });
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      }
    } catch {
      // Tenta próximo
    }

    // 4. Tenta POST /api/{session}/webhooks
    try {
      const response = await this.client.post(`/api/${sessionName}/webhooks`, {
        url: webhookUrl,
        events,
      });
      return response.data;
    } catch {
      // Tenta próximo
    }

    // 5. Fallback para rota legada /api/sessions/{session}/webhooks
    try {
      const response = await this.client.post(
        `/api/sessions/${sessionName}/webhooks`,
        {
          url: webhookUrl,
          events,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao registrar webhook para ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Remover webhook
   */
  async removeWebhook(sessionName: string, webhookId: string): Promise<void> {
    try {
      await this.client.delete(
        `/api/sessions/${sessionName}/webhooks/${webhookId}`
      );
    } catch (error) {
      console.error(`[WAHA] Erro ao remover webhook:`, error);
      throw error;
    }
  }
}

// Exportar instância singleton
let wahaClient: WAHAClient | null = null;
let lastConfigHash: string | null = null;

function getConfigHash(config: WAHAConfig): string {
  return `${config.baseURL}-${config.apiKey || ""}-${config.timeout || 30000}`;
}

export async function getWAHAClient(): Promise<WAHAClient> {
  try {
    const { getActiveWAHAConfiguration } = await import("./db");
    const activeConfig = await getActiveWAHAConfiguration();

    if (activeConfig) {
      const currentHash = getConfigHash({
        baseURL: activeConfig.baseUrl,
        apiKey: activeConfig.apiKey || undefined,
      });

      if (!wahaClient || lastConfigHash !== currentHash) {
        wahaClient = new WAHAClient({
          baseURL: activeConfig.baseUrl,
          apiKey: activeConfig.apiKey || undefined,
          timeout: 30000,
        });
        lastConfigHash = currentHash;
        console.log("[WAHA] Cliente inicializado com configuração do banco:", activeConfig.baseUrl);
      }
    } else {
      const fallbackBaseURL = process.env.WAHA_API_URL || "http://localhost:3001";
      const fallbackApiKey = process.env.WAHA_API_KEY;

      if (!wahaClient || lastConfigHash !== `${fallbackBaseURL}-${fallbackApiKey || ""}`) {
        wahaClient = new WAHAClient({
          baseURL: fallbackBaseURL,
          apiKey: fallbackApiKey,
          timeout: 30000,
        });
        lastConfigHash = `${fallbackBaseURL}-${fallbackApiKey || ""}`;
        console.log("[WAHA] Cliente inicializado com fallback (ENV):", fallbackBaseURL);
      }
    }
  } catch (error) {
    console.error("[WAHA] Erro ao buscar configuração do banco, usando fallback:", error);
    const fallbackBaseURL = process.env.WAHA_API_URL || "http://localhost:3001";
    const fallbackApiKey = process.env.WAHA_API_KEY;

    if (!wahaClient || lastConfigHash !== `${fallbackBaseURL}-${fallbackApiKey || ""}`) {
      wahaClient = new WAHAClient({
        baseURL: fallbackBaseURL,
        apiKey: fallbackApiKey,
        timeout: 30000,
      });
      lastConfigHash = `${fallbackBaseURL}-${fallbackApiKey || ""}`;
    }
  }

  return wahaClient;
}

export function initializeWAHAClient(config: WAHAConfig): WAHAClient {
  wahaClient = new WAHAClient(config);
  lastConfigHash = getConfigHash(config);
  return wahaClient;
}
