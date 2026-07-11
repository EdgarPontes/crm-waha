CREATE TABLE `aiConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('openai','claude','gemini','ollama','openrouter') NOT NULL,
	`apiKey` text NOT NULL,
	`model` varchar(255) NOT NULL,
	`systemPrompt` text,
	`temperature` decimal(3,2) DEFAULT '0.7',
	`maxTokens` int DEFAULT 2000,
	`isActive` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiConfigurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiConfigurations_provider_unique` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` enum('login','logout','create','update','delete','move_kanban','transfer_conversation','send_message','receive_message') NOT NULL,
	`entityType` enum('lead','conversation','message','contact','user','automation','ai_config'),
	`entityId` int,
	`changes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`trigger` enum('message_contains','response_yes','inactivity_hours') NOT NULL,
	`triggerValue` varchar(255) NOT NULL,
	`action` enum('move_stage','send_message','add_tag','assign_user') NOT NULL,
	`actionValue` json,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whatsappNumber` varchar(20) NOT NULL,
	`name` varchar(255),
	`avatar` varchar(512),
	`email` varchar(320),
	`phone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastInteractionAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contacts_whatsappNumber_unique` UNIQUE(`whatsappNumber`),
	CONSTRAINT `whatsappNumber_idx` UNIQUE(`whatsappNumber`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`leadId` int,
	`currentAssignedUserId` int,
	`status` enum('active','waiting_human','closed') NOT NULL DEFAULT 'active',
	`aiProvider` enum('openai','claude','gemini','ollama','openrouter','none') DEFAULT 'none',
	`unreadCount` int DEFAULT 0,
	`lastMessageAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeBaseDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` enum('pdf','docx','txt','csv') NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`content` text,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledgeBaseDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`stageId` int NOT NULL,
	`assignedToUserId` int,
	`tags` json DEFAULT ('[]'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`closedAt` timestamp,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int,
	`senderPhone` varchar(20),
	`type` enum('text','image','audio','video','document','location') NOT NULL DEFAULT 'text',
	`content` text,
	`mediaUrl` varchar(512),
	`metadata` json,
	`waMessageId` varchar(255),
	`status` enum('sent','delivered','read') NOT NULL DEFAULT 'sent',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipelines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pipelineId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`order` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(7) DEFAULT '#3b82f6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `whatsappSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionName` varchar(255) NOT NULL,
	`status` enum('disconnected','connecting','connected','error') NOT NULL DEFAULT 'disconnected',
	`qrCode` text,
	`phoneNumber` varchar(20),
	`lastErrorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsappSessions_sessionName_unique` UNIQUE(`sessionName`),
	CONSTRAINT `sessionName_idx` UNIQUE(`sessionName`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('Administrador','Supervisor','Atendente') NOT NULL DEFAULT 'Atendente';--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `openId_idx` UNIQUE(`openId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `auditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `lastInteractionAt_idx` ON `contacts` (`lastInteractionAt`);--> statement-breakpoint
CREATE INDEX `contactId_idx` ON `conversations` (`contactId`);--> statement-breakpoint
CREATE INDEX `leadId_idx` ON `conversations` (`leadId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `conversations` (`status`);--> statement-breakpoint
CREATE INDEX `lastMessageAt_idx` ON `conversations` (`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `uploadedBy_idx` ON `knowledgeBaseDocuments` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `contactId_idx` ON `leads` (`contactId`);--> statement-breakpoint
CREATE INDEX `stageId_idx` ON `leads` (`stageId`);--> statement-breakpoint
CREATE INDEX `assignedToUserId_idx` ON `leads` (`assignedToUserId`);--> statement-breakpoint
CREATE INDEX `conversationId_idx` ON `messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `conversationId_idx` ON `notes` (`conversationId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `notes` (`userId`);--> statement-breakpoint
CREATE INDEX `pipelineId_idx` ON `stages` (`pipelineId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `whatsappSessions` (`status`);