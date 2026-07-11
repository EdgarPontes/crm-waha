import { eq, and, desc, asc, sql } from "drizzle-orm";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import {
  buildCustomDatabaseUrl,
  getDatabaseType,
} from "./_core/database-config";
import {
  InsertUser,
  users,
  contacts,
  leads,
  conversations,
  messages,
  stages,
  pipelines,
  whatsappSessions,
  tags,
  notes,
  automations,
  aiConfigurations,
  knowledgeBaseDocuments,
  auditLogs,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import bcrypt from "bcryptjs";

let _db: any = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    // Prioridade: 1. Banco de dados customizado, 2. Banco de dados padrão Manus
    const customDbUrl = buildCustomDatabaseUrl();
    const dbUrl = customDbUrl || process.env.DATABASE_URL;

    if (dbUrl) {
      try {
        const dbType = getDatabaseType();

        if (dbType === "postgres") {
          // Para PostgreSQL, usamos postgres-js
          _db = drizzlePostgres(dbUrl);
        } else {
          // Para MySQL, MariaDB, TiDB
          _db = drizzleMysql(dbUrl);
        }
      } catch (error) {
        console.warn("[Database] Failed to connect:", error);
        _db = null;
      }
    }
  }
  return _db;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email && !user.openId) {
    throw new Error("User email or openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: Partial<InsertUser> = {};
    const updateSet: Record<string, unknown> = {};

    // Determine unique identifier
    if (user.email) {
      values.email = user.email;
    }
    if (user.openId) {
      values.openId = user.openId;
    }

    const textFields = ["name", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Use email or openId as the unique key for upsert
    if (user.email) {
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.email,
        set: updateSet,
      });
    } else if (user.openId) {
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users);
}

// ============================================================================
// LOCAL AUTH OPERATIONS (Email/Password)
// ============================================================================

export async function createLocalUser(
  email: string,
  password: string,
  name?: string,
  role: "Administrador" | "Supervisor" | "Atendente" = "Atendente"
) {
  const db = await getDb();
  if (!db) return null;

  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  await db.insert(users).values({
    email,
    passwordHash,
    name: name || email.split("@")[0],
    loginMethod: "local",
    role,
    emailVerified: false,
    lastSignedIn: new Date(),
  });

  // Fetch and return the created user (without passwordHash)
  const created = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      loginMethod: users.loginMethod,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function verifyLocalUser(email: string, password: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (result.length === 0) {
    return null; // User not found
  }

  const user = result[0];

  // Check if user has a password (local auth)
  if (!user.passwordHash) {
    return null; // User uses OAuth, not local auth
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null; // Invalid password
  }

  // Update lastSignedIn
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  // Return user without passwordHash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) return false;

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return true;
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));

  return true;
}

export async function setUserEmailVerified(userId: number) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return true;
}

// ============================================================================
// CONTACT OPERATIONS
// ============================================================================

export async function getOrCreateContact(
  whatsappNumber: string,
  name?: string
) {
  const db = await getDb();
  if (!db) return null;

  // Try to find existing contact
  const existing = await db
    .select()
    .from(contacts)
    .where(eq(contacts.whatsappNumber, whatsappNumber))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new contact
  await db.insert(contacts).values({
    whatsappNumber,
    name: name || whatsappNumber,
    lastInteractionAt: new Date(),
  });

  // Fetch and return the created contact
  const created = await db
    .select()
    .from(contacts)
    .where(eq(contacts.whatsappNumber, whatsappNumber))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function listContacts(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.lastInteractionAt))
    .limit(limit)
    .offset(offset);
}

export async function updateContactLastInteraction(contactId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(contacts)
    .set({ lastInteractionAt: new Date() })
    .where(eq(contacts.id, contactId));
}

// ============================================================================
// LEAD OPERATIONS
// ============================================================================

export async function createLead(
  contactId: number,
  stageId: number,
  assignedToUserId?: number
) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(leads).values({
    contactId,
    stageId,
    assignedToUserId,
    tags: [],
  });

  // Fetch and return the created lead
  const created = await db
    .select()
    .from(leads)
    .where(eq(leads.contactId, contactId))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getLeadByContactId(contactId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.contactId, contactId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function listLeadsByStage(stageId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(leads)
    .where(eq(leads.stageId, stageId))
    .orderBy(asc(leads.createdAt));
}

export async function moveLeadToStage(leadId: number, stageId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(leads)
    .set({ stageId, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}

export async function updateLeadNotes(leadId: number, notes: string) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(leads)
    .set({ notes, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}

export async function addTagToLead(leadId: number, tagName: string) {
  const db = await getDb();
  if (!db) return null;

  const lead = await getLeadById(leadId);
  if (!lead) return null;

  const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
  if (!currentTags.includes(tagName)) {
    currentTags.push(tagName);
  }

  return await db
    .update(leads)
    .set({ tags: currentTags, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

export async function getOrCreateConversation(
  contactId: number,
  leadId?: number
) {
  const db = await getDb();
  if (!db) return null;

  // Try to find existing conversation
  const existing = await db
    .select()
    .from(conversations)
    .where(eq(conversations.contactId, contactId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new conversation
  await db.insert(conversations).values({
    contactId,
    leadId,
    status: "active",
  });

  // Fetch and return the created conversation
  const created = await db
    .select()
    .from(conversations)
    .where(eq(conversations.contactId, contactId))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function listConversations(
  status?: string,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.status, status as any))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);
  }

  return await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit)
    .offset(offset);
}

export async function updateConversationStatus(
  conversationId: number,
  status: "active" | "waiting_human" | "closed"
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(conversations)
    .set({ status, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function assignConversationToUser(
  conversationId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(conversations)
    .set({ currentAssignedUserId: userId, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

export async function createMessage(
  conversationId: number,
  type: string,
  content?: string,
  mediaUrl?: string,
  senderId?: number,
  senderPhone?: string,
  waMessageId?: string
) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(messages).values({
    conversationId,
    type: type as any,
    content,
    mediaUrl,
    senderId,
    senderPhone,
    waMessageId,
    status: "sent",
  });

  // Fetch and return the created message
  const created = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function listMessagesByConversation(
  conversationId: number,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// PIPELINE & STAGE OPERATIONS
// ============================================================================

export async function createDefaultPipeline() {
  const db = await getDb();
  if (!db) return null;

  // Check if default pipeline already exists
  const existing = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.isDefault, true))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default pipeline
  await db.insert(pipelines).values({
    name: "Pipeline Padrão",
    description: "Pipeline padrão do CRM",
    isDefault: true,
  });

  // Fetch the created pipeline
  const created = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.isDefault, true))
    .limit(1);

  if (!created.length) return null;

  const pipelineId = created[0].id;

  // Create default stages
  const stageNames = [
    "Novo Lead",
    "Primeiro Contato",
    "Qualificação",
    "Proposta",
    "Negociação",
    "Fechamento",
    "Ganho",
    "Perdido",
  ];

  for (let i = 0; i < stageNames.length; i++) {
    await db.insert(stages).values({
      pipelineId,
      name: stageNames[i],
      order: i,
    });
  }

  return created[0];
}

export async function getDefaultPipeline() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.isDefault, true))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getStagesByPipeline(pipelineId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId))
    .orderBy(asc(stages.order));
}

export async function getFirstStage(pipelineId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId))
    .orderBy(asc(stages.order))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============================================================================
// WHATSAPP SESSION OPERATIONS
// ============================================================================

export async function createWhatsAppSession(sessionName: string) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(whatsappSessions).values({
    sessionName,
    status: "disconnected",
  });

  // Fetch and return the created session
  const created = await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.sessionName, sessionName))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function getWhatsAppSessionByName(sessionName: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.sessionName, sessionName))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function listWhatsAppSessions() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(whatsappSessions);
}

export async function updateWhatsAppSessionStatus(
  sessionId: number,
  status: string,
  qrCode?: string,
  phoneNumber?: string,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(whatsappSessions)
    .set({
      status: status as any,
      qrCode,
      phoneNumber,
      lastErrorMessage: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(whatsappSessions.id, sessionId));
}

// ============================================================================
// TAG OPERATIONS
// ============================================================================

export async function createTag(name: string, color = "#3b82f6") {
  const db = await getDb();
  if (!db) return null;

  await db.insert(tags).values({
    name,
    color,
  });

  // Fetch and return the created tag
  const created = await db
    .select()
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function listTags() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tags);
}

// ============================================================================
// NOTE OPERATIONS
// ============================================================================

export async function createNote(
  conversationId: number,
  userId: number,
  content: string
) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(notes).values({
    conversationId,
    userId,
    content,
  });

  // Fetch and return the created note
  const created = await db
    .select()
    .from(notes)
    .where(eq(notes.conversationId, conversationId))
    .orderBy(desc(notes.createdAt))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function listNotesByConversation(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notes)
    .where(eq(notes.conversationId, conversationId))
    .orderBy(desc(notes.createdAt));
}

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

export async function createAuditLog(
  userId: number | undefined,
  action: string,
  entityType?: string,
  entityId?: number,
  changes?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return null;

  return await db.insert(auditLogs).values({
    userId,
    action: action as any,
    entityType: entityType as any,
    entityId,
    changes,
  });
}

// ============================================================================
// AI CONFIGURATION OPERATIONS
// ============================================================================

export async function getActiveAIConfiguration() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(aiConfigurations)
    .where(eq(aiConfigurations.isActive, true))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAIConfigurationByProvider(provider: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(aiConfigurations)
    .where(eq(aiConfigurations.provider, provider as any))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============================================================================
// PIPELINE CRUD OPERATIONS
// ============================================================================

export async function listPipelines() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pipelines).orderBy(asc(pipelines.createdAt));
}

export async function getPipeline(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPipeline(name: string, description?: string) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(pipelines).values({
    name,
    description,
    isDefault: false,
  });

  const created = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.name, name))
    .orderBy(desc(pipelines.createdAt))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function updatePipeline(
  id: number,
  data: { name?: string; description?: string }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  return await db.update(pipelines).set(updateData).where(eq(pipelines.id, id));
}

export async function deletePipeline(id: number) {
  const db = await getDb();
  if (!db) return null;

  // Delete stages first
  await db.delete(stages).where(eq(stages.pipelineId, id));
  return await db.delete(pipelines).where(eq(pipelines.id, id));
}

// ============================================================================
// STAGE CRUD OPERATIONS
// ============================================================================

export async function createStage(
  pipelineId: number,
  name: string,
  order?: number
) {
  const db = await getDb();
  if (!db) return null;

  if (order === undefined) {
    const existingStages = await getStagesByPipeline(pipelineId);
    order = existingStages.length;
  }

  await db.insert(stages).values({
    pipelineId,
    name,
    order,
  });

  const created = await db
    .select()
    .from(stages)
    .where(and(eq(stages.pipelineId, pipelineId), eq(stages.name, name)))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function updateStage(
  id: number,
  data: { name?: string; order?: number }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.order !== undefined) updateData.order = data.order;

  return await db.update(stages).set(updateData).where(eq(stages.id, id));
}

export async function deleteStage(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(stages).where(eq(stages.id, id));
}

// ============================================================================
// LEAD CRUD OPERATIONS
// ============================================================================

export async function listLeadsByPipeline(pipelineId: number) {
  const db = await getDb();
  if (!db) return [];

  const pipelineStages = await getStagesByPipeline(pipelineId);
  const stageIds = pipelineStages.map((s: { id: number }) => s.id);

  if (stageIds.length === 0) return [];

  return await db.select().from(leads).orderBy(asc(leads.createdAt));
}

export async function updateLead(
  id: number,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;
  updateData.updatedAt = new Date();

  return await db.update(leads).set(updateData).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(leads).where(eq(leads.id, id));
}

// TODO: add more feature queries here as your schema grows.
