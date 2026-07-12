CREATE TABLE "attendanceQueue" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attendanceQueue_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversationId" integer NOT NULL,
	"contactId" integer NOT NULL,
	"priority" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'waiting' NOT NULL,
	"assignedUserId" integer,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"assignedAt" timestamp,
	"startedAt" timestamp,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendanceQueue_conversationId_unique" UNIQUE("conversationId")
);
--> statement-breakpoint
CREATE INDEX "attendance_queue_status_idx" ON "attendanceQueue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_queue_assigned_user_idx" ON "attendanceQueue" USING btree ("assignedUserId");--> statement-breakpoint
CREATE INDEX "attendance_queue_priority_idx" ON "attendanceQueue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "attendance_queue_requested_at_idx" ON "attendanceQueue" USING btree ("requestedAt");