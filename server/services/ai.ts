import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, Message, generateText } from "ai";

export type AIProvider = "openai" | "claude" | "gemini" | "ollama" | "openrouter";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class AIService {
  private configs: Map<AIProvider, AIConfig> = new Map();
  private defaultConfig: AIConfig | null = null;

  setConfig(config: AIConfig) {
    this.configs.set(config.provider, config);
    if (config.isActive || !this.defaultConfig) {
      this.defaultConfig = config;
    }
  }

  getConfig(provider: AIProvider): AIConfig | undefined {
    return this.configs.get(provider);
  }

  getDefaultConfig(): AIConfig | null {
    return this.defaultConfig;
  }

  private getClient(config: AIConfig) {
    switch (config.provider) {
      case "openai":
        return createOpenAI({ apiKey: config.apiKey });
      case "claude":
        return createAnthropic({ apiKey: config.apiKey });
      case "gemini":
        return createGoogleGenerativeAI({ apiKey: config.apiKey });
      case "ollama":
        return createOpenAI({
          apiKey: config.apiKey || "ollama",
          baseURL: config.apiKey || "http://localhost:11434/v1",
        });
      case "openrouter":
        return createOpenAI({
          apiKey: config.apiKey,
          baseURL: "https://openrouter.ai/api/v1",
        });
      default:
        throw new Error(`Provedor não suportado: ${config.provider}`);
    }
  }

  async testConnection(config: AIConfig): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.getClient(config);
      const model = client(config.model);

      // Simple test message
      const result = await generateText({
        model,
        messages: [{ role: "user", content: "Olá, responda apenas 'OK'" }],
        maxTokens: 10,
        temperature: 0,
      });

      return {
        success: true,
        message: `Conexão OK - Resposta: ${result.text.substring(0, 50)}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro ao conectar: ${error.message || "Erro desconhecido"}`,
      };
    }
  }

  async generateResponse(
    config: AIConfig,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      const client = this.getClient(config);
      const model = client(config.model);

      const aiMessages: Message[] = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const result = await generateText({
        model,
        messages: aiMessages,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });

      return {
        content: result.text,
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
      };
    } catch (error: any) {
      console.error("[AI] Erro ao gerar resposta:", error);
      throw new Error(`Erro ao gerar resposta: ${error.message || "Erro desconhecido"}`);
    }
  }

  async *streamResponse(
    config: AIConfig,
    messages: ChatMessage[],
    systemPrompt?: string
  ): AsyncIterable<string> {
    const client = this.getClient(config);
    const model = client(config.model);

    const aiMessages: Message[] = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const result = streamText({
      model,
      messages: aiMessages,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  detectHandoff(message: string): { shouldHandoff: boolean; reason?: string } {
    const lowerMessage = message.toLowerCase();
    
    const handoffKeywords = [
      "quero falar com atendente",
      "falar com humano",
      "atendente humano",
      "preciso de ajuda humana",
      "transferir para atendente",
      "não entendi",
      "não consegue me ajudar",
      "incompetente",
      "inútil",
      "péssimo atendimento",
      "reclamação",
      "reclamar",
      "protocolo",
      "abrir chamado",
      "supervisor",
      "gerente",
      "cancelar",
      "estorno",
      "devolução",
      "problema grave",
      "urgente",
      "emergência",
    ];

    const foundKeyword = handoffKeywords.find((keyword) => lowerMessage.includes(keyword));
    
    if (foundKeyword) {
      return {
        shouldHandoff: true,
        reason: `Palavra-chave detectada: "${foundKeyword}"`,
      };
    }

    // Check for repeated questions (simple heuristic)
    // This would be more sophisticated in production
    return { shouldHandoff: false };
  }

  buildContextPrompt(contactInfo?: {
    name?: string;
    whatsappNumber?: string;
    tags?: string[];
    notes?: string;
    leadStage?: string;
  }): string {
    if (!contactInfo) return "";

    const parts: string[] = ["--- Contexto do Cliente ---"];
    
    if (contactInfo.name) parts.push(`Nome: ${contactInfo.name}`);
    if (contactInfo.whatsappNumber) parts.push(`WhatsApp: ${contactInfo.whatsappNumber}`);
    if (contactInfo.leadStage) parts.push(`Estágio no Funil: ${contactInfo.leadStage}`);
    if (contactInfo.tags && contactInfo.tags.length > 0) parts.push(`Tags: ${contactInfo.tags.join(", ")}`);
    if (contactInfo.notes) parts.push(`Observações: ${contactInfo.notes}`);

    return parts.join("\n");
  }
}

export const aiService = new AIService();