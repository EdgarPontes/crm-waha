import {
  int,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  json,
  mysqlEnum,
  mysqlTable,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Users - Autenticação e autorização
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["Administrador", "Supervisor", "Atendente"])
      .default("Atendente")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    openIdIdx: uniqueIndex("openId_idx").on(table.openId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contacts - Contatos do CRM
 */
export const contacts = mysqlTable(
  "contacts",
  {
    id: int("id").autoincrement().primaryKey(),
    whatsappNumber: varchar("whatsappNumber", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    avatar: varchar("avatar", { length: 512 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 20 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastInteractionAt: timestamp("lastInteractionAt").defaultNow().notNull(),
  },
  (table) => ({
    whatsappNumberIdx: uniqueIndex("whatsappNumber_idx").on(table.whatsappNumber),
    lastInteractionIdx: index("lastInteractionAt_idx").on(table.lastInteractionAt),
  })
);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Pipelines - Funis de vendas
 */
export const pipelines = mysqlTable("pipelines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = typeof pipelines.$inferInsert;

/**
 * Stages - Colunas do Kanban
 */
export const stages = mysqlTable(
  "stages",
  {
    id: int("id").autoincrement().primaryKey(),
    pipelineId: int("pipelineId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    order: int("order").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    pipelineIdIdx: index("pipelineId_idx").on(table.pipelineId),
  })
);

export type Stage = typeof stages.$inferSelect;
export type InsertStage = typeof stages.$inferInsert;

/**
 * Leads - Oportunidades de vendas
 */
export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    contactId: int("contactId").notNull(),
    stageId: int("stageId").notNull(),
    assignedToUserId: int("assignedToUserId"),
    tags: json("tags").$type<string[]>().default([]),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    closedAt: timestamp("closedAt"),
  },
  (table) => ({
    contactIdIdx: index("contactId_idx").on(table.contactId),
    stageIdIdx: index("stageId_idx").on(table.stageId),
    assignedToUserIdIdx: index("assignedToUserId_idx").on(table.assignedToUserId),
  })
);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Conversations - Conversas com contatos
 */
export const conversations = mysqlTable(
  "conversations",
  {
    id: int("id").autoincrement().primaryKey(),
    contactId: int("contactId").notNull(),
    leadId: int("leadId"),
    currentAssignedUserId: int("currentAssignedUserId"),
    status: mysqlEnum("status", ["active", "waiting_human", "closed"])
      .default("active")
      .notNull(),
    aiProvider: mysqlEnum("aiProvider", [
      "openai",
      "claude",
      "gemini",
      "ollama",
      "openrouter",
      "none",
    ])
      .default("none"),
    unreadCount: int("unreadCount").default(0),
    lastMessageAt: timestamp("lastMessageAt").defaultNow(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    contactIdIdx: index("contactId_idx").on(table.contactId),
    leadIdIdx: index("leadId_idx").on(table.leadId),
    statusIdx: index("status_idx").on(table.status),
    lastMessageAtIdx: index("lastMessageAt_idx").on(table.lastMessageAt),
  })
);

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages - Mensagens das conversas
 */
export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull(),
    senderId: int("senderId"),
    senderPhone: varchar("senderPhone", { length: 20 }),
    type: mysqlEnum("type", [
      "text",
      "image",
      "audio",
      "video",
      "document",
      "location",
    ])
      .default("text")
      .notNull(),
    content: text("content"),
    mediaUrl: varchar("mediaUrl", { length: 512 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    waMessageId: varchar("waMessageId", { length: 255 }),
    status: mysqlEnum("status", ["sent", "delivered", "read"])
      .default("sent")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("conversationId_idx").on(table.conversationId),
    createdAtIdx: index("createdAt_idx").on(table.createdAt),
  })
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * WhatsAppSessions - Sessões WAHA
 */
export const whatsappSessions = mysqlTable(
  "whatsappSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionName: varchar("sessionName", { length: 255 }).notNull().unique(),
    status: mysqlEnum("status", [
      "disconnected",
      "connecting",
      "connected",
      "error",
    ])
      .default("disconnected")
      .notNull(),
    qrCode: text("qrCode"),
    phoneNumber: varchar("phoneNumber", { length: 20 }),
    lastErrorMessage: text("lastErrorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    sessionNameIdx: uniqueIndex("sessionName_idx").on(table.sessionName),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type WhatsAppSession = typeof whatsappSessions.$inferSelect;
export type InsertWhatsAppSession = typeof whatsappSessions.$inferInsert;

/**
 * AIConfigurations - Configurações de IA
 */
export const aiConfigurations = mysqlTable(
  "aiConfigurations",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: mysqlEnum("provider", [
      "openai",
      "claude",
      "gemini",
      "ollama",
      "openrouter",
    ])
      .notNull()
      .unique(),
    apiKey: text("apiKey").notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    systemPrompt: text("systemPrompt"),
    temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
    maxTokens: int("maxTokens").default(2000),
    isActive: boolean("isActive").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type AIConfiguration = typeof aiConfigurations.$inferSelect;
export type InsertAIConfiguration = typeof aiConfigurations.$inferInsert;

/**
 * KnowledgeBaseDocuments - Base de conhecimento
 */
export const knowledgeBaseDocuments = mysqlTable(
  "knowledgeBaseDocuments",
  {
    id: int("id").autoincrement().primaryKey(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileType: mysqlEnum("fileType", ["pdf", "docx", "txt", "csv"])
      .notNull(),
    fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
    content: text("content"),
    uploadedBy: int("uploadedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    uploadedByIdx: index("uploadedBy_idx").on(table.uploadedBy),
  })
);

export type KnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferSelect;
export type InsertKnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferInsert;

/**
 * Automations - Regras de automação
 */
export const automations = mysqlTable(
  "automations",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    trigger: mysqlEnum("trigger", [
      "message_contains",
      "response_yes",
      "inactivity_hours",
    ]).notNull(),
    triggerValue: varchar("triggerValue", { length: 255 }).notNull(),
    action: mysqlEnum("action", [
      "move_stage",
      "send_message",
      "add_tag",
      "assign_user",
    ]).notNull(),
    actionValue: json("actionValue").$type<Record<string, unknown>>(),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = typeof automations.$inferInsert;

/**
 * Tags - Etiquetas
 */
export const tags = mysqlTable(
  "tags",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    color: varchar("color", { length: 7 }).default("#3b82f6"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Notes - Notas internas
 */
export const notes = mysqlTable(
  "notes",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull(),
    userId: int("userId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("conversationId_idx").on(table.conversationId),
    userIdIdx: index("userId_idx").on(table.userId),
  })
);

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * AuditLogs - Auditoria
 */
export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    action: mysqlEnum("action", [
      "login",
      "logout",
      "create",
      "update",
      "delete",
      "move_kanban",
      "transfer_conversation",
      "send_message",
      "receive_message",
    ]).notNull(),
    entityType: mysqlEnum("entityType", [
      "lead",
      "conversation",
      "message",
      "contact",
      "user",
      "automation",
      "ai_config",
    ]),
    entityId: int("entityId"),
    changes: json("changes").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("userId_idx").on(table.userId),
    createdAtIdx: index("createdAt_idx").on(table.createdAt),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
