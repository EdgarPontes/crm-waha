-- ============================================================================
-- Script de Migração PostgreSQL para CRM Omnichannel WAHA
-- Convertido de MySQL para PostgreSQL
-- Execute no pgAdmin (Query Tool) ou via psql
-- ============================================================================

-- ============================================================================
-- CRIAÇÃO DE TIPOS ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE ai_provider AS ENUM ('openai', 'claude', 'gemini', 'ollama', 'openrouter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('login', 'logout', 'create', 'update', 'delete', 'move_kanban', 'transfer_conversation', 'send_message', 'receive_message');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_entity AS ENUM ('lead', 'conversation', 'message', 'contact', 'user', 'automation', 'ai_config');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE automation_trigger AS ENUM ('message_contains', 'response_yes', 'inactivity_hours');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE automation_action AS ENUM ('move_stage', 'send_message', 'add_tag', 'assign_user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('active', 'waiting_human', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_ai_provider AS ENUM ('openai', 'claude', 'gemini', 'ollama', 'openrouter', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE knowledge_base_file_type AS ENUM ('pdf', 'docx', 'txt', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_session_status AS ENUM ('disconnected', 'connecting', 'connected', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Administrador', 'Supervisor', 'Atendente');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TRIGGER FUNCTION PARA updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABELA: users (criada primeiro, pois é referenciada por outras tabelas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "users" (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role user_role NOT NULL DEFAULT 'Atendente',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "users_openId_unique" UNIQUE("openId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "openId_idx" ON "users" ("openId");

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CRIAÇÃO DE TABELAS

-- Tabela: aiConfigurations
CREATE TABLE IF NOT EXISTS "aiConfigurations" (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider ai_provider NOT NULL,
  "apiKey" TEXT NOT NULL,
  model VARCHAR(255) NOT NULL,
  "systemPrompt" TEXT,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  "maxTokens" INTEGER DEFAULT 2000,
  "isActive" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "aiConfigurations_provider_unique" UNIQUE(provider)
);

CREATE TRIGGER update_aiConfigurations_updated_at
  BEFORE UPDATE ON "aiConfigurations"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: auditLogs
CREATE TABLE IF NOT EXISTS "auditLogs" (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "userId" INTEGER,
  action audit_action NOT NULL,
  "entityType" audit_entity,
  "entityId" INTEGER,
  changes JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "userId_idx" ON "auditLogs" ("userId");
CREATE INDEX IF NOT EXISTS "createdAt_idx" ON "auditLogs" ("createdAt");

-- Tabela: automations
CREATE TABLE IF NOT EXISTS automations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trigger automation_trigger NOT NULL,
  "triggerValue" VARCHAR(255) NOT NULL,
  action automation_action NOT NULL,
  "actionValue" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: contacts
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "whatsappNumber" VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  avatar VARCHAR(512),
  email VARCHAR(320),
  phone VARCHAR(20),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastInteractionAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "contacts_whatsappNumber_unique" UNIQUE("whatsappNumber"),
  CONSTRAINT "whatsappNumber_idx" UNIQUE("whatsappNumber")
);

CREATE INDEX IF NOT EXISTS "lastInteractionAt_idx" ON contacts ("lastInteractionAt");

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: conversations
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "contactId" INTEGER NOT NULL,
  "leadId" INTEGER,
  "currentAssignedUserId" INTEGER,
  status conversation_status NOT NULL DEFAULT 'active',
  "aiProvider" conversation_ai_provider DEFAULT 'none',
  "unreadCount" INTEGER DEFAULT 0,
  "lastMessageAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "contactId_idx" ON conversations ("contactId");
CREATE INDEX IF NOT EXISTS "leadId_idx" ON conversations ("leadId");
CREATE INDEX IF NOT EXISTS "status_idx" ON conversations (status);
CREATE INDEX IF NOT EXISTS "lastMessageAt_idx" ON conversations ("lastMessageAt");

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: knowledgeBaseDocuments
CREATE TABLE IF NOT EXISTS "knowledgeBaseDocuments" (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "fileName" VARCHAR(255) NOT NULL,
  "fileType" knowledge_base_file_type NOT NULL,
  "fileUrl" VARCHAR(512) NOT NULL,
  content TEXT,
  "uploadedBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "uploadedBy_idx" ON "knowledgeBaseDocuments" ("uploadedBy");

-- Tabela: leads
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "contactId" INTEGER NOT NULL,
  "stageId" INTEGER NOT NULL,
  "assignedToUserId" INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "closedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "contactId_idx_leads" ON leads ("contactId");
CREATE INDEX IF NOT EXISTS "stageId_idx" ON leads ("stageId");
CREATE INDEX IF NOT EXISTS "assignedToUserId_idx" ON leads ("assignedToUserId");

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: messages
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "conversationId" INTEGER NOT NULL,
  "senderId" INTEGER,
  "senderPhone" VARCHAR(20),
  type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  "mediaUrl" VARCHAR(512),
  metadata JSONB,
  "waMessageId" VARCHAR(255),
  status message_status NOT NULL DEFAULT 'sent',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "conversationId_idx_messages" ON messages ("conversationId");
CREATE INDEX IF NOT EXISTS "createdAt_idx_messages" ON messages ("createdAt");

-- Tabela: notes
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "conversationId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "conversationId_idx_notes" ON notes ("conversationId");
CREATE INDEX IF NOT EXISTS "userId_idx_notes" ON notes ("userId");

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: pipelines
CREATE TABLE IF NOT EXISTS pipelines (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: stages
CREATE TABLE IF NOT EXISTS stages (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "pipelineId" INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "pipelineId_idx" ON stages ("pipelineId");

-- Tabela: tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "tags_name_unique" UNIQUE(name)
);

-- Tabela: whatsappSessions
CREATE TABLE IF NOT EXISTS "whatsappSessions" (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "sessionName" VARCHAR(255) NOT NULL,
  status whatsapp_session_status NOT NULL DEFAULT 'disconnected',
  "qrCode" TEXT,
  "phoneNumber" VARCHAR(20),
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "whatsappSessions_sessionName_unique" UNIQUE("sessionName"),
  CONSTRAINT "sessionName_idx" UNIQUE("sessionName")
);

CREATE INDEX IF NOT EXISTS "status_idx_whatsapp" ON "whatsappSessions" (status);

CREATE TRIGGER update_whatsappSessions_updated_at
  BEFORE UPDATE ON "whatsappSessions"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MENSAGEM DE FINALIZAÇÃO
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Migração concluída com sucesso!';
END $$;
