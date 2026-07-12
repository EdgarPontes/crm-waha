import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  getActiveAIConfiguration,
  getAIConfigurationByProvider,
  createAuditLog,
  getConversationById,
  getContactById,
  listMessagesByConversation,
  createMessage,
  updateConversationStatus,
  getLeadById,
  getStagesByPipeline,
  getDefaultPipeline,
  listKnowledgeBaseDocuments,
  createKnowledgeBaseDocument,
  deleteKnowledgeBaseDocument,
} from "../db";
import { aiService, type AIConfig, type ChatMessage } from "../services/ai";
import { createRAGService } from "../services/rag";

export const aiRouter = router({
  config: router({
    getActive: protectedProcedure.query(async () => {
      return await getActiveAIConfiguration();
    }),

    getByProvider: protectedProcedure
      .input(z.object({ provider: z.string() }))
      .query(async ({ input }) => {
        return await getAIConfigurationByProvider(input.provider);
      }),

    update: adminProcedure
      .input(
        z.object({
          provider: z.enum([
            "openai",
            "claude",
            "gemini",
            "ollama",
            "openrouter",
          ]),
          apiKey: z.string(),
          model: z.string(),
          systemPrompt: z.string().optional(),
          temperature: z.number().min(0).max(2).default(0.7),
          maxTokens: z.number().default(2000),
          isActive: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const dbConfig: AIConfig = {
          provider: input.provider,
          apiKey: input.apiKey,
          model: input.model,
          systemPrompt: input.systemPrompt,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          isActive: input.isActive,
        };

        aiService.setConfig(dbConfig);

        await createAuditLog(ctx.user?.id, "update", "ai_config", undefined, {
          provider: input.provider,
        });

        return {
          provider: input.provider,
          model: input.model,
          isActive: input.isActive,
        };
      }),

    testConnection: adminProcedure
      .input(
        z.object({
          provider: z.enum([
            "openai",
            "claude",
            "gemini",
            "ollama",
            "openrouter",
          ]),
          apiKey: z.string(),
          model: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const config: AIConfig = {
          provider: input.provider,
          apiKey: input.apiKey,
          model: input.model,
          temperature: 0.7,
          maxTokens: 2000,
        };

        const result = await aiService.testConnection(config);
        return result;
      }),

    listConfigs: adminProcedure.query(async () => {
      // Return all configured providers
      return Array.from(["openai", "claude", "gemini", "ollama", "openrouter"]).map(
        (p) => aiService.getConfig(p as any)
      ).filter(Boolean);
    }),
  }),

  // ========================================================================
  // CHAT COMPLETION
  // ========================================================================
  chat: router({
    complete: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          messages: z.array(
            z.object({
              role: z.enum(["user", "assistant", "system"]),
              content: z.string(),
            })
          ),
          systemPrompt: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Get active AI config
        const activeConfig = await getActiveAIConfiguration();
        if (!activeConfig || !activeConfig.isActive) {
          throw new Error("Nenhuma configuração de IA ativa encontrada");
        }

        const config: AIConfig = {
          provider: activeConfig.provider as any,
          apiKey: activeConfig.apiKey,
          model: activeConfig.model,
          systemPrompt: activeConfig.systemPrompt || input.systemPrompt,
          temperature: Number(activeConfig.temperature) || 0.7,
          maxTokens: activeConfig.maxTokens || 2000,
        };

        // Build context from conversation
        const conversation = await getConversationById(input.conversationId);
        if (!conversation) {
          throw new Error("Conversa não encontrada");
        }

        let contextPrompt = "";
        if (conversation.contactId) {
          const contact = await getContactById(conversation.contactId);
          if (contact) {
            // Get lead info if exists
            let leadStage: string | undefined;
            if (conversation.leadId) {
              const lead = await getLeadById(conversation.leadId);
              if (lead) {
                const pipeline = await getDefaultPipeline();
                if (pipeline) {
                  const stages = await getStagesByPipeline(pipeline.id);
                  const stage = stages.find((s) => s.id === lead.stageId);
                  leadStage = stage?.name;
                }
              }
            }

            contextPrompt = aiService.buildContextPrompt({
              name: contact.name || undefined,
              whatsappNumber: contact.whatsappNumber || undefined,
              tags: [], // Could add tags from lead
              notes: undefined, // Could add notes from lead
              leadStage,
            });
          }
        }

        // Combine system prompt with context
        const fullSystemPrompt = [
          config.systemPrompt || "Você é um atendente de vendas profissional e prestativo.",
          contextPrompt,
        ]
          .filter(Boolean)
          .join("\n\n");

        // Generate response
        const aiMessages: ChatMessage[] = input.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await aiService.generateResponse(config, aiMessages, fullSystemPrompt);

        // Save AI response as message
        const savedMessage = await createMessage(
          input.conversationId,
          "text",
          response.content,
          undefined,
          undefined,
          undefined,
          undefined,
          { aiGenerated: true, provider: config.provider, model: config.model }
        );

        return {
          conversationId: input.conversationId,
          response: response.content,
          messageId: savedMessage?.id || `msg_${Date.now()}`,
          usage: response.usage,
        };
      }),

    // Check if message should trigger handoff
    checkHandoff: protectedProcedure
      .input(z.object({ message: z.string() }))
      .mutation(async ({ input }) => {
        const handoff = aiService.detectHandoff(input.message);
        return handoff;
      }),
  }),

  // ========================================================================
  // KNOWLEDGE BASE (RAG)
  // ========================================================================
  knowledgeBase: router({
    // Search knowledge base using RAG
    search: protectedProcedure
      .input(
        z.object({
          query: z.string(),
          limit: z.number().default(5),
        })
      )
      .mutation(async ({ input }) => {
        const activeConfig = await getActiveAIConfiguration();
        if (!activeConfig || !activeConfig.isActive) {
          throw new Error("Nenhuma configuração de IA ativa para busca semântica");
        }

        const documents = await listKnowledgeBaseDocuments();
        
        // Filter documents with embeddings
        const docsWithEmbeddings = documents
          .filter(d => d.embedding)
          .map(d => ({
            id: d.id,
            content: d.content || "",
            embedding: JSON.parse(d.embedding!),
          }));

        if (docsWithEmbeddings.length === 0) {
          return { query: input.query, results: [], count: 0 };
        }

        const ragService = createRAGService(activeConfig.apiKey);
        const results = await ragService.searchSimilar(
          input.query,
          docsWithEmbeddings,
          input.limit
        );

        return {
          query: input.query,
          results,
          count: results.length,
        };
      }),

    // Upload document to knowledge base
    upload: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileType: z.enum(["pdf", "docx", "txt", "csv"]),
          fileUrl: z.string(),
          content: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Create document record
        let doc = null;
        
        // If content provided, process for embeddings first
        if (input.content) {
          const activeConfig = await getActiveAIConfiguration();
          if (activeConfig && activeConfig.isActive) {
            try {
              const ragService = createRAGService(activeConfig.apiKey);
              
              // Process document into chunks with embeddings
              const chunks = await ragService.processDocument(
                Buffer.from(input.content),
                input.fileType
              );

              // Create document with first chunk's embedding
              if (chunks.length > 0) {
                const firstChunk = chunks[0];
                doc = await createKnowledgeBaseDocument({
                  fileName: input.fileName,
                  fileType: input.fileType as any,
                  fileUrl: input.fileUrl,
                  content: input.content,
                  embedding: firstChunk.embedding,
                  chunkIndex: 0,
                  totalChunks: chunks.length,
                  uploadedBy: ctx.user?.id,
                });
              }
            } catch (error) {
              console.error("[RAG] Error processing document:", error);
            }
          }
        }
        
        // Fallback: create without embeddings
        if (!doc) {
          doc = await createKnowledgeBaseDocument({
            fileName: input.fileName,
            fileType: input.fileType as any,
            fileUrl: input.fileUrl,
            content: input.content,
            uploadedBy: ctx.user?.id,
          });
        }

        await createAuditLog(
          ctx.user?.id,
          "create",
          "knowledge_base",
          doc?.id,
          { fileName: input.fileName }
        );

        return doc;
      }),

    // List all documents
    list: protectedProcedure.query(async () => {
      return await listKnowledgeBaseDocuments();
    }),

    // Delete document
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteKnowledgeBaseDocument(input.id);
        await createAuditLog(
          ctx.user?.id,
          "delete",
          "knowledge_base",
          input.id,
          {}
        );
        return { success: true };
      }),
  }),
});