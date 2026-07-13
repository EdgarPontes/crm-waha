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
  attendanceQueue,
  wahaConfigurations,
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

export async function updateUserRole(userId: number, role: string) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(users)
    .set({ role: role as any, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserInfo(
  userId: number,
  data: { name?: string; email?: string }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;

  return await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(users).where(eq(users.id, userId));
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

export async function createContact(data: {
  name: string;
  whatsappNumber: string;
  email?: string;
  phone?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(contacts).values({
    whatsappNumber: data.whatsappNumber,
    name: data.name,
    email: data.email,
    phone: data.phone,
    lastInteractionAt: new Date(),
  });

  const created = await db
    .select()
    .from(contacts)
    .where(eq(contacts.whatsappNumber, data.whatsappNumber))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function updateContact(
  contactId: number,
  data: { name?: string; whatsappNumber?: string; email?: string; phone?: string }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.whatsappNumber !== undefined) updateData.whatsappNumber = data.whatsappNumber;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;

  return await db
    .update(contacts)
    .set(updateData)
    .where(eq(contacts.id, contactId));
}

export async function deleteContact(contactId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(contacts).where(eq(contacts.id, contactId));
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

export async function updateLeadTags(leadId: number, tags: string[]) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(leads)
    .set({ tags, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}

export async function updateLeadAssignee(leadId: number, assignedToUserId: number | null) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(leads)
    .set({ assignedToUserId, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}

export async function updateLeadDueDate(leadId: number, dueDate: Date | null) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(leads)
    .set({ dueDate, updatedAt: new Date() })
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
  offset = 0,
  tag?: string
) {
  const db = await getDb();
  if (!db) return [];

  const whereConditions = [];
  if (status) {
    whereConditions.push(eq(conversations.status, status as any));
  }
  if (tag) {
    whereConditions.push(
      sql`EXISTS (
        SELECT 1 FROM leads 
        WHERE leads.id = conversations.leadId 
        AND ${tag} = ANY(leads.tags)
      )`
    );
  }

  const query = db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit)
    .offset(offset);

  if (whereConditions.length > 0) {
    return await query.where(and(...whereConditions));
  }

  return await query;
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
  waMessageId?: string,
  metadata?: Record<string, unknown>
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
    metadata,
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

export async function getMessageByWaMessageId(waMessageId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.waMessageId, waMessageId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateMessageStatus(
  messageId: number,
  status: "sent" | "delivered" | "read"
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(messages)
    .set({ status })
    .where(eq(messages.id, messageId));
}

export async function updateMessageStatusByWaId(
  waMessageId: string,
  status: "sent" | "delivered" | "read"
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(messages)
    .set({ status })
    .where(eq(messages.waMessageId, waMessageId));
}

export async function updateContactInfo(
  contactId: number,
  data: { name?: string; avatar?: string; email?: string; phone?: string }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  updateData.updatedAt = new Date();

  return await db
    .update(contacts)
    .set(updateData)
    .where(eq(contacts.id, contactId));
}

export async function getContactByWhatsappNumber(
  whatsappNumber: string
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(contacts)
    .where(eq(contacts.whatsappNumber, whatsappNumber))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateConversationUnreadCount(
  conversationId: number,
  unreadCount: number
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(conversations)
    .set({ unreadCount, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function updateConversationLastMessageAt(
  conversationId: number
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
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

export async function updateWhatsAppSessionByName(
  sessionName: string,
  data: {
    status?: string;
    qrCode?: string;
    phoneNumber?: string;
    lastErrorMessage?: string;
  }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status !== undefined) updateData.status = data.status as any;
  if (data.qrCode !== undefined) updateData.qrCode = data.qrCode;
  if (data.phoneNumber !== undefined)
    updateData.phoneNumber = data.phoneNumber;
  if (data.lastErrorMessage !== undefined)
    updateData.lastErrorMessage = data.lastErrorMessage;

  return await db
    .update(whatsappSessions)
    .set(updateData)
    .where(eq(whatsappSessions.sessionName, sessionName));
}

export async function getWhatsAppSessionsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.status, status as any));
}

export async function deleteWhatsAppSessionByName(sessionName: string) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .delete(whatsappSessions)
    .where(eq(whatsappSessions.sessionName, sessionName));
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

export async function getTagByName(name: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(tags).where(eq(tags.id, id));
}

export async function updateTag(
  id: number,
  data: { name?: string; color?: string }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.color !== undefined) updateData.color = data.color;

  return await db.update(tags).set(updateData).where(eq(tags.id, id));
}

export async function removeTagFromLead(leadId: number, tagName: string) {
  const db = await getDb();
  if (!db) return null;

  const lead = await getLeadById(leadId);
  if (!lead) return null;

  const currentTags = Array.isArray(lead.tags)
    ? lead.tags.filter((t: string) => t !== tagName)
    : [];

  return await db
    .update(leads)
    .set({ tags: currentTags, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
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
// ATTENDANCE QUEUE OPERATIONS
// ============================================================================

export async function addToAttendanceQueue(
  conversationId: number,
  contactId: number,
  priority = 0
) {
  const db = await getDb();
  if (!db) return null;

  // Check if already in queue
  const existing = await db
    .select()
    .from(attendanceQueue)
    .where(eq(attendanceQueue.conversationId, conversationId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  await db.insert(attendanceQueue).values({
    conversationId,
    contactId,
    priority,
    status: "waiting",
    requestedAt: new Date(),
  });

  const created = await db
    .select()
    .from(attendanceQueue)
    .where(eq(attendanceQueue.conversationId, conversationId))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function getAttendanceQueueItem(conversationId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(attendanceQueue)
    .where(eq(attendanceQueue.conversationId, conversationId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function listAttendanceQueue(
  status?: string,
  assignedUserId?: number,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(attendanceQueue)
    .orderBy(desc(attendanceQueue.priority), asc(attendanceQueue.requestedAt))
    .limit(limit)
    .offset(offset);

  if (status) {
    query = query.where(eq(attendanceQueue.status, status as any));
  }

  if (assignedUserId) {
    query = query.where(eq(attendanceQueue.assignedUserId, assignedUserId));
  }

  return await query;
}

export async function assignQueueItem(
  queueId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(attendanceQueue)
    .set({
      status: "assigned",
      assignedUserId: userId,
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(attendanceQueue.id, queueId));
}

export async function startAttendance(queueId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(attendanceQueue)
    .set({
      status: "in_progress",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(attendanceQueue.id, queueId));
}

export async function closeAttendance(queueId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(attendanceQueue)
    .set({
      status: "closed",
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(attendanceQueue.id, queueId));
}

export async function updateQueuePriority(queueId: number, priority: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(attendanceQueue)
    .set({
      priority,
      updatedAt: new Date(),
    })
    .where(eq(attendanceQueue.id, queueId));
}

export async function removeFromAttendanceQueue(conversationId: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .delete(attendanceQueue)
    .where(eq(attendanceQueue.conversationId, conversationId));
}

export async function getQueueStats() {
  const db = await getDb();
  if (!db) return { waiting: 0, assigned: 0, inProgress: 0, closed: 0 };

  const stats = await db
    .select({
      status: attendanceQueue.status,
      count: sql<number>`count(*)`,
    })
    .from(attendanceQueue)
    .groupBy(attendanceQueue.status);

  const result = { waiting: 0, assigned: 0, inProgress: 0, closed: 0 };
  for (const stat of stats) {
    result[stat.status as keyof typeof result] = Number(stat.count);
  }

  return result;
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
    dueDate?: Date | null;
    tags?: string[];
    assignedToUserId?: number | null;
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
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.assignedToUserId !== undefined) updateData.assignedToUserId = data.assignedToUserId;
  updateData.updatedAt = new Date();

  return await db.update(leads).set(updateData).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(leads).where(eq(leads.id, id));
}

// ============================================================================
// AI CONFIGURATION CRUD OPERATIONS
// ============================================================================

export async function createAIConfiguration(data: {
  provider: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature?: string;
  maxTokens?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;

  // If isActive, deactivate all other configs
  if (data.isActive) {
    await db
      .update(aiConfigurations)
      .set({ isActive: false })
      .where(eq(aiConfigurations.isActive, true));
  }

  await db.insert(aiConfigurations).values({
    provider: data.provider as any,
    apiKey: data.apiKey,
    model: data.model,
    systemPrompt: data.systemPrompt,
    temperature: data.temperature ?? "0.7",
    maxTokens: data.maxTokens ?? 2000,
    isActive: data.isActive ?? false,
  });

  // Upsert: if provider already exists, we need to update instead
  // For simplicity we use onConflictDoUpdate
  const created = await db
    .select()
    .from(aiConfigurations)
    .where(eq(aiConfigurations.provider, data.provider as any))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function updateAIConfiguration(
  provider: string,
  data: {
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
    temperature?: string;
    maxTokens?: number;
    isActive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return null;

  // If activating, deactivate all others
  if (data.isActive) {
    await db
      .update(aiConfigurations)
      .set({ isActive: false })
      .where(eq(aiConfigurations.isActive, true));
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
  if (data.model !== undefined) updateData.model = data.model;
  if (data.systemPrompt !== undefined)
    updateData.systemPrompt = data.systemPrompt;
  if (data.temperature !== undefined) updateData.temperature = data.temperature;
  if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return await db
    .update(aiConfigurations)
    .set(updateData)
    .where(eq(aiConfigurations.provider, provider as any));
}

export async function listAIConfigurations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(aiConfigurations);
}

export async function deleteAIConfiguration(provider: string) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .delete(aiConfigurations)
    .where(eq(aiConfigurations.provider, provider as any));
}

// ============================================================================
// KNOWLEDGE BASE CRUD OPERATIONS
// ============================================================================

export async function createKnowledgeBaseDocument(data: {
  fileName: string;
  fileType: string;
  fileUrl: string;
  content?: string;
  embedding?: number[];
  chunkIndex?: number;
  totalChunks?: number;
  uploadedBy?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(knowledgeBaseDocuments).values({
    fileName: data.fileName,
    fileType: data.fileType as any,
    fileUrl: data.fileUrl,
    content: data.content,
    embedding: data.embedding ? JSON.stringify(data.embedding) : null,
    chunkIndex: data.chunkIndex ?? 0,
    totalChunks: data.totalChunks ?? 1,
    uploadedBy: data.uploadedBy,
  });

  const created = await db
    .select()
    .from(knowledgeBaseDocuments)
    .orderBy(desc(knowledgeBaseDocuments.createdAt))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function listKnowledgeBaseDocuments() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(knowledgeBaseDocuments)
    .orderBy(desc(knowledgeBaseDocuments.createdAt));
}

export async function getKnowledgeBaseDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function deleteKnowledgeBaseDocument(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .delete(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.id, id));
}

// ============================================================================
// AUTOMATION CRUD OPERATIONS
// ============================================================================

export async function createAutomation(data: {
  name: string;
  trigger: string;
  triggerValue: string;
  action: string;
  actionValue?: Record<string, unknown>;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(automations).values({
    name: data.name,
    trigger: data.trigger as any,
    triggerValue: data.triggerValue,
    action: data.action as any,
    actionValue: data.actionValue,
    isActive: data.isActive ?? true,
  });

  const created = await db
    .select()
    .from(automations)
    .orderBy(desc(automations.createdAt))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function listAutomations() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(automations)
    .orderBy(desc(automations.createdAt));
}

export async function getAutomationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(automations)
    .where(eq(automations.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateAutomation(
  id: number,
  data: {
    name?: string;
    trigger?: string;
    triggerValue?: string;
    action?: string;
    actionValue?: Record<string, unknown>;
    isActive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.trigger !== undefined) updateData.trigger = data.trigger as any;
  if (data.triggerValue !== undefined)
    updateData.triggerValue = data.triggerValue;
  if (data.action !== undefined) updateData.action = data.action as any;
  if (data.actionValue !== undefined) updateData.actionValue = data.actionValue;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return await db
    .update(automations)
    .set(updateData)
    .where(eq(automations.id, id));
}

export async function deleteAutomation(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.delete(automations).where(eq(automations.id, id));
}

export async function listActiveAutomations() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(automations)
    .where(eq(automations.isActive, true));
}

// ============================================================================
// AUDIT LOG OPERATIONS (extended)
// ============================================================================

export async function listAuditLogs(
  limit = 100,
  offset = 0,
  filters?: { userId?: number; action?: string; entityType?: string }
) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(auditLogs).$dynamic();

  if (filters?.userId) {
    query = query.where(eq(auditLogs.userId, filters.userId)) as any;
  }
  if (filters?.action) {
    query = query.where(eq(auditLogs.action, filters.action as any)) as any;
  }
  if (filters?.entityType) {
    query = query.where(
      eq(auditLogs.entityType, filters.entityType as any)
    ) as any;
  }

  return await query
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// WAHA CONFIGURATION OPERATIONS
// ============================================================================

export async function getActiveWAHAConfiguration() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(wahaConfigurations)
    .where(eq(wahaConfigurations.isActive, true))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getWAHAConfigurationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(wahaConfigurations)
    .where(eq(wahaConfigurations.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getWAHAConfigurationByName(name: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(wahaConfigurations)
    .where(eq(wahaConfigurations.name, name))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function listWAHAConfigurations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(wahaConfigurations);
}

export async function createWAHAConfiguration(data: {
  name: string;
  baseUrl: string;
  apiKey?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;

  // If activating, deactivate all others
  if (data.isActive) {
    await db
      .update(wahaConfigurations)
      .set({ isActive: false })
      .where(eq(wahaConfigurations.isActive, true));
  }

  await db.insert(wahaConfigurations).values({
    name: data.name,
    baseUrl: data.baseUrl,
    apiKey: data.apiKey || null,
    isActive: data.isActive ?? true,
  });

  const created = await db
    .select()
    .from(wahaConfigurations)
    .where(eq(wahaConfigurations.name, data.name))
    .limit(1);

  const config = created.length > 0 ? created[0] : null;

  // Se a configuração foi criada como ativa, sincroniza sessões do WAHA
  if (config?.isActive) {
    await syncSessionsFromWAHA(config.baseUrl, config.apiKey || undefined);
  }

  return config;
}

export async function updateWAHAConfiguration(
  id: number,
  data: {
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    isActive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return null;

  // If activating, deactivate all others
  if (data.isActive) {
    await db
      .update(wahaConfigurations)
      .set({ isActive: false })
      .where(eq(wahaConfigurations.isActive, true));
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
  if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await db
    .update(wahaConfigurations)
    .set(updateData)
    .where(eq(wahaConfigurations.id, id));

  // Get the updated config to check if it's active
  const updated = await db
    .select()
    .from(wahaConfigurations)
    .where(eq(wahaConfigurations.id, id))
    .limit(1);

  const config = updated.length > 0 ? updated[0] : null;

  // Se a configuração foi ativada, sincroniza sessões do WAHA
  if (config?.isActive) {
    await syncSessionsFromWAHA(config.baseUrl, config.apiKey || undefined);
  }

  return config;
}

export async function deleteWAHAConfiguration(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .delete(wahaConfigurations)
    .where(eq(wahaConfigurations.id, id));
}

export async function testWAHAConnection(baseUrl: string, apiKey?: string) {
  try {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      headers: apiKey ? { "X-Api-Key": apiKey } : {},
      timeout: 5000,
    });
    return {
      success: response.ok,
      status: response.status,
      message: response.ok
        ? "Conexão bem-sucedida"
        : `Erro: ${response.status} ${response.statusText}`,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 0,
      message: `Erro de conexão: ${error.message || "Não foi possível conectar"}`,
    };
  }
}

// Mapa de status WAHA -> Banco
const WAHA_STATUS_MAP: Record<string, "disconnected" | "connecting" | "connected" | "error"> = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  STARTING: "connecting",
  STOPPING: "disconnected",
  QR_REQUIRED: "connecting",
  FAILED: "error",
};

/**
 * Sincroniza sessões do WAHA com o banco de dados
 */
export async function syncSessionsFromWAHA(baseUrl: string, apiKey?: string) {
  const db = await getDb();
  if (!db) return { synced: 0, errors: 0 };

  try {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      headers: apiKey ? { "X-Api-Key": apiKey } : {},
      timeout: 10000,
    });

    if (!response.ok) {
      console.error("[Sync] WAHA respondeu com erro:", response.status);
      return { synced: 0, errors: 1 };
    }

    const data = await response.json();
    const wahaSessions = data.sessions || data || [];
    let synced = 0;
    let errors = 0;

    for (const ws of wahaSessions) {
      try {
        const sessionName = ws.name || ws.sessionName;
        if (!sessionName) continue;

        const mappedStatus = WAHA_STATUS_MAP[ws?.status] || "connecting";
        const phoneNumber = ws?.me?.id || "";

        // Verifica se já existe no banco
        const existing = await db
          .select()
          .from(whatsappSessions)
          .where(eq(whatsappSessions.sessionName, sessionName))
          .limit(1);

        if (existing.length > 0) {
          // Atualiza existente
          await db
            .update(whatsappSessions)
            .set({
              status: mappedStatus,
              phoneNumber: phoneNumber || null,
              updatedAt: new Date(),
            })
            .where(eq(whatsappSessions.sessionName, sessionName));
        } else {
          // Cria novo
          await db.insert(whatsappSessions).values({
            sessionName,
            status: mappedStatus,
            phoneNumber: phoneNumber || null,
          });
        }
        synced++;
      } catch (err) {
        console.error("[Sync] Erro ao sincronizar sessão:", err);
        errors++;
      }
    }

    console.log(`[Sync] Sincronizado: ${synced} sessões, ${errors} erros`);
    return { synced, errors };
  } catch (error) {
    console.error("[Sync] Erro na sincronização:", error);
    return { synced: 0, errors: 1 };
  }
}
