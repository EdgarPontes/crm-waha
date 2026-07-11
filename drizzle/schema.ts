import {
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  numeric,
  jsonb,
  pgTable,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS PostgreSQL
// ============================================================================
export const userRoleEnum = pgEnum("user_role", ["Administrador", "Supervisor", "Atendente"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["active", "waiting_human", "closed"]);
export const conversationAiProviderEnum = pgEnum("conversation_ai_provider", ["openai", "claude", "gemini", "ollama", "openrouter", "none"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "image", "audio", "video", "document", "location"]);
export const messageStatusEnum = pgEnum("message_status", ["sent", "delivered", "read"]);
export const whatsappSessionStatusEnum = pgEnum("whatsapp_session_status", ["disconnected", "connecting", "connected", "error"]);
export const aiProviderEnum = pgEnum("ai_provider", ["openai", "claude", "gemini", "ollama", "openrouter"]);
export const knowledgeBaseFileTypeEnum = pgEnum("knowledge_base_file_type", ["pdf", "docx", "txt", "csv"]);
export const automationTriggerEnum = pgEnum("automation_trigger", ["message_contains", "response_yes", "inactivity_hours"]);
export const automationActionEnum = pgEnum("automation_action", ["move_stage", "send_message", "add_tag", "assign_user"]);
export const auditActionEnum = pgEnum("audit_action", ["login", "logout", "create", "update", "delete", "move_kanban", "transfer_conversation", "send_message", "receive_message"]);
export const auditEntityEnum = pgEnum("audit_entity", ["lead", "conversation", "message", "contact", "user", "automation", "ai_config"]);

// ============================================================================
// USERS
// ============================================================================
export const users = pgTable(
  "users",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    openId: varchar("openId", { length: 64 }).unique(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    name: text("name"),
    loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
    role: userRoleEnum("role").default("Atendente").notNull(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    openIdIdx: uniqueIndex("openId_idx").on(table.openId),
    emailIdx: uniqueIndex("email_idx").on(table.email),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// CONTACTS
// ============================================================================
export const contacts = pgTable(
  "contacts",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    whatsappNumber: varchar("whatsappNumber", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    avatar: varchar("avatar", { length: 512 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 20 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastInteractionAt: timestamp("lastInteractionAt").defaultNow().notNull(),
  },
  (table) => ({
    whatsappNumberIdx: uniqueIndex("whatsappNumber_idx").on(table.whatsappNumber),
    lastInteractionIdx: index("lastInteractionAt_idx").on(table.lastInteractionAt),
  })
);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ============================================================================
// PIPELINES
// ============================================================================
export const pipelines = pgTable("pipelines", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = typeof pipelines.$inferInsert;

// ============================================================================
// STAGES
// ============================================================================
export const stages = pgTable(
  "stages",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    pipelineId: integer("pipelineId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    pipelineIdIdx: index("pipelineId_idx").on(table.pipelineId),
  })
);

export type Stage = typeof stages.$inferSelect;
export type InsertStage = typeof stages.$inferInsert;

// ============================================================================
// LEADS
// ============================================================================
export const leads = pgTable(
  "leads",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    contactId: integer("contactId").notNull(),
    stageId: integer("stageId").notNull(),
    assignedToUserId: integer("assignedToUserId"),
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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

// ============================================================================
// CONVERSATIONS
// ============================================================================
export const conversations = pgTable(
  "conversations",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    contactId: integer("contactId").notNull(),
    leadId: integer("leadId"),
    currentAssignedUserId: integer("currentAssignedUserId"),
    status: conversationStatusEnum("status").default("active").notNull(),
    aiProvider: conversationAiProviderEnum("aiProvider").default("none"),
    unreadCount: integer("unreadCount").default(0),
    lastMessageAt: timestamp("lastMessageAt").defaultNow(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    contactIdIdx: index("contactId_idx_conversations").on(table.contactId),
    leadIdIdx: index("leadId_idx").on(table.leadId),
    statusIdx: index("status_idx").on(table.status),
    lastMessageAtIdx: index("lastMessageAt_idx").on(table.lastMessageAt),
  })
);

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ============================================================================
// MESSAGES
// ============================================================================
export const messages = pgTable(
  "messages",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    conversationId: integer("conversationId").notNull(),
    senderId: integer("senderId"),
    senderPhone: varchar("senderPhone", { length: 20 }),
    type: messageTypeEnum("type").default("text").notNull(),
    content: text("content"),
    mediaUrl: varchar("mediaUrl", { length: 512 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    waMessageId: varchar("waMessageId", { length: 255 }),
    status: messageStatusEnum("status").default("sent").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("conversationId_idx_messages").on(table.conversationId),
    createdAtIdx: index("createdAt_idx_messages").on(table.createdAt),
  })
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============================================================================
// WHATSAPP SESSIONS
// ============================================================================
export const whatsappSessions = pgTable(
  "whatsappSessions",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    sessionName: varchar("sessionName", { length: 255 }).notNull().unique(),
    status: whatsappSessionStatusEnum("status").default("disconnected").notNull(),
    qrCode: text("qrCode"),
    phoneNumber: varchar("phoneNumber", { length: 20 }),
    lastErrorMessage: text("lastErrorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    sessionNameIdx: uniqueIndex("sessionName_idx").on(table.sessionName),
    statusIdx: index("status_idx_whatsapp").on(table.status),
  })
);

export type WhatsAppSession = typeof whatsappSessions.$inferSelect;
export type InsertWhatsAppSession = typeof whatsappSessions.$inferInsert;

// ============================================================================
// AI CONFIGURATIONS
// ============================================================================
export const aiConfigurations = pgTable(
  "aiConfigurations",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    provider: aiProviderEnum("provider").notNull().unique(),
    apiKey: text("apiKey").notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    systemPrompt: text("systemPrompt"),
    temperature: numeric("temperature", { precision: 3, scale: 2 }).default("0.7"),
    maxTokens: integer("maxTokens").default(2000),
    isActive: boolean("isActive").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  }
);

export type AIConfiguration = typeof aiConfigurations.$inferSelect;
export type InsertAIConfiguration = typeof aiConfigurations.$inferInsert;

// ============================================================================
// KNOWLEDGE BASE DOCUMENTS
// ============================================================================
export const knowledgeBaseDocuments = pgTable(
  "knowledgeBaseDocuments",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileType: knowledgeBaseFileTypeEnum("fileType").notNull(),
    fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
    content: text("content"),
    uploadedBy: integer("uploadedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    uploadedByIdx: index("uploadedBy_idx").on(table.uploadedBy),
  })
);

export type KnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferSelect;
export type InsertKnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferInsert;

// ============================================================================
// AUTOMATIONS
// ============================================================================
export const automations = pgTable(
  "automations",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    trigger: automationTriggerEnum("trigger").notNull(),
    triggerValue: varchar("triggerValue", { length: 255 }).notNull(),
    action: automationActionEnum("action").notNull(),
    actionValue: jsonb("actionValue").$type<Record<string, unknown>>(),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  }
);

export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = typeof automations.$inferInsert;

// ============================================================================
// TAGS
// ============================================================================
export const tags = pgTable(
  "tags",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    color: varchar("color", { length: 7 }).default("#3b82f6"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// ============================================================================
// NOTES
// ============================================================================
export const notes = pgTable(
  "notes",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    conversationId: integer("conversationId").notNull(),
    userId: integer("userId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("conversationId_idx_notes").on(table.conversationId),
    userIdIdx: index("userId_idx_notes").on(table.userId),
  })
);

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// ============================================================================
// AUDIT LOGS
// ============================================================================
export const auditLogs = pgTable(
  "auditLogs",
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId"),
    action: auditActionEnum("action").notNull(),
    entityType: auditEntityEnum("entityType"),
    entityId: integer("entityId"),
    changes: jsonb("changes").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("userId_idx_audit").on(table.userId),
    createdAtIdx: index("createdAt_idx_audit").on(table.createdAt),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;