CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'claude', 'gemini', 'ollama', 'openrouter');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('login', 'logout', 'create', 'update', 'delete', 'move_kanban', 'transfer_conversation', 'send_message', 'receive_message');--> statement-breakpoint
CREATE TYPE "public"."audit_entity" AS ENUM('lead', 'conversation', 'message', 'contact', 'user', 'automation', 'ai_config');--> statement-breakpoint
CREATE TYPE "public"."automation_action" AS ENUM('move_stage', 'send_message', 'add_tag', 'assign_user');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger" AS ENUM('message_contains', 'response_yes', 'inactivity_hours');--> statement-breakpoint
CREATE TYPE "public"."conversation_ai_provider" AS ENUM('openai', 'claude', 'gemini', 'ollama', 'openrouter', 'none');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'waiting_human', 'closed');--> statement-breakpoint
CREATE TYPE "public"."knowledge_base_file_type" AS ENUM('pdf', 'docx', 'txt', 'csv');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'delivered', 'read');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'audio', 'video', 'document', 'location');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Administrador', 'Supervisor', 'Atendente');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_session_status" AS ENUM('disconnected', 'connecting', 'connected', 'error');--> statement-breakpoint
CREATE TABLE "aiConfigurations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "aiConfigurations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"provider" "ai_provider" NOT NULL,
	"apiKey" text NOT NULL,
	"model" varchar(255) NOT NULL,
	"systemPrompt" text,
	"temperature" numeric(3, 2) DEFAULT '0.7',
	"maxTokens" integer DEFAULT 2000,
	"isActive" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aiConfigurations_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auditLogs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer,
	"action" "audit_action" NOT NULL,
	"entityType" "audit_entity",
	"entityId" integer,
	"changes" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "automations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"trigger" "automation_trigger" NOT NULL,
	"triggerValue" varchar(255) NOT NULL,
	"action" "automation_action" NOT NULL,
	"actionValue" jsonb,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contacts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"whatsappNumber" varchar(20) NOT NULL,
	"name" varchar(255),
	"avatar" varchar(512),
	"email" varchar(320),
	"phone" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastInteractionAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_whatsappNumber_unique" UNIQUE("whatsappNumber")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contactId" integer NOT NULL,
	"leadId" integer,
	"currentAssignedUserId" integer,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"aiProvider" "conversation_ai_provider" DEFAULT 'none',
	"unreadCount" integer DEFAULT 0,
	"lastMessageAt" timestamp DEFAULT now(),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledgeBaseDocuments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "knowledgeBaseDocuments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fileName" varchar(255) NOT NULL,
	"fileType" "knowledge_base_file_type" NOT NULL,
	"fileUrl" varchar(512) NOT NULL,
	"content" text,
	"embedding" text,
	"chunkIndex" integer DEFAULT 0,
	"totalChunks" integer DEFAULT 1,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "leads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contactId" integer NOT NULL,
	"stageId" integer NOT NULL,
	"assignedToUserId" integer,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"dueDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversationId" integer NOT NULL,
	"senderId" integer,
	"senderPhone" varchar(20),
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"mediaUrl" varchar(512),
	"metadata" jsonb,
	"waMessageId" varchar(255),
	"status" "message_status" DEFAULT 'sent' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversationId" integer NOT NULL,
	"userId" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pipelines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"isDefault" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pipelineId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"order" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"color" varchar(7) DEFAULT '#3b82f6',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"openId" varchar(64),
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255),
	"name" text,
	"loginMethod" varchar(64) DEFAULT 'local',
	"role" "user_role" DEFAULT 'Atendente' NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsappSessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "whatsappSessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sessionName" varchar(255) NOT NULL,
	"status" "whatsapp_session_status" DEFAULT 'disconnected' NOT NULL,
	"qrCode" text,
	"phoneNumber" varchar(20),
	"lastErrorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsappSessions_sessionName_unique" UNIQUE("sessionName")
);
--> statement-breakpoint
CREATE INDEX "userId_idx_audit" ON "auditLogs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "createdAt_idx_audit" ON "auditLogs" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsappNumber_idx" ON "contacts" USING btree ("whatsappNumber");--> statement-breakpoint
CREATE INDEX "lastInteractionAt_idx" ON "contacts" USING btree ("lastInteractionAt");--> statement-breakpoint
CREATE INDEX "contactId_idx_conversations" ON "conversations" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "leadId_idx" ON "conversations" USING btree ("leadId");--> statement-breakpoint
CREATE INDEX "status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lastMessageAt_idx" ON "conversations" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE INDEX "uploadedBy_idx" ON "knowledgeBaseDocuments" USING btree ("uploadedBy");--> statement-breakpoint
CREATE INDEX "contactId_idx" ON "leads" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "stageId_idx" ON "leads" USING btree ("stageId");--> statement-breakpoint
CREATE INDEX "assignedToUserId_idx" ON "leads" USING btree ("assignedToUserId");--> statement-breakpoint
CREATE INDEX "dueDate_idx" ON "leads" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "conversationId_idx_messages" ON "messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "createdAt_idx_messages" ON "messages" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "conversationId_idx_notes" ON "notes" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "userId_idx_notes" ON "notes" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "pipelineId_idx" ON "stages" USING btree ("pipelineId");--> statement-breakpoint
CREATE UNIQUE INDEX "openId_idx" ON "users" USING btree ("openId");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "sessionName_idx" ON "whatsappSessions" USING btree ("sessionName");--> statement-breakpoint
CREATE INDEX "status_idx_whatsapp" ON "whatsappSessions" USING btree ("status");