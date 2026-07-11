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
        ? { Authorization: `Bearer ${config.apiKey}` }
        : {},
    });
  }

  /**
   * Listar todas as sessões
   */
  async listSessions(): Promise<SessionInfo[]> {
    try {
      const response = await this.client.get("/sessions");
      return response.data.sessions || [];
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
      const response = await this.client.get(`/sessions/${sessionName}`);
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao obter sessão ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Criar uma nova sessão
   */
  async createSession(sessionName: string): Promise<SessionInfo> {
    try {
      const response = await this.client.post("/sessions", {
        sessionName,
      });
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao criar sessão ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Obter QR Code para conectar uma sessão
   */
  async getQRCode(sessionName: string): Promise<string> {
    try {
      const response = await this.client.get(`/sessions/${sessionName}/qr`);
      return response.data.qr;
    } catch (error) {
      console.error(`[WAHA] Erro ao obter QR Code para ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Desconectar uma sessão
   */
  async disconnectSession(sessionName: string): Promise<void> {
    try {
      await this.client.post(`/sessions/${sessionName}/logout`);
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
      await this.client.delete(`/sessions/${sessionName}`);
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
        `/sessions/${sessionName}/messages`,
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
        `/sessions/${sessionName}/messages`,
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
        `/sessions/${sessionName}/messages`,
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
      const response = await this.client.post("/sessions/start", {
        sessionName,
      });
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao iniciar sessão ${sessionName}:`, error);
      throw error;
    }
  }

  /**
   * Obter status de todas as sessões de uma vez
   */
  async getSessionsStatus(): Promise<any> {
    try {
      const response = await this.client.get("/sessions/status");
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
        `/sessions/${sessionName}/chats/${chatId}/messages`,
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
        `/sessions/${sessionName}/messages/${messageId}/read`
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
        `/sessions/${sessionName}/contacts/${contactId}`
      );
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao obter contato:`, error);
      throw error;
    }
  }

  /**
   * Registrar webhook para receber eventos
   */
  async registerWebhook(
    sessionName: string,
    webhookUrl: string,
    events: string[] = ["message", "message.status", "session.status"]
  ): Promise<any> {
    try {
      const response = await this.client.post(
        `/sessions/${sessionName}/webhooks`,
        {
          url: webhookUrl,
          events,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[WAHA] Erro ao registrar webhook:`, error);
      throw error;
    }
  }

  /**
   * Remover webhook
   */
  async removeWebhook(sessionName: string, webhookId: string): Promise<void> {
    try {
      await this.client.delete(
        `/sessions/${sessionName}/webhooks/${webhookId}`
      );
    } catch (error) {
      console.error(`[WAHA] Erro ao remover webhook:`, error);
      throw error;
    }
  }
}

// Exportar instância singleton
let wahaClient: WAHAClient | null = null;

export function getWAHAClient(): WAHAClient {
  if (!wahaClient) {
    const baseURL = process.env.WAHA_API_URL || "http://localhost:3001";
    const apiKey = process.env.WAHA_API_KEY;

    wahaClient = new WAHAClient({
      baseURL,
      apiKey,
      timeout: 30000,
    });
  }
  return wahaClient;
}

export function initializeWAHAClient(config: WAHAConfig): WAHAClient {
  wahaClient = new WAHAClient(config);
  return wahaClient;
}
