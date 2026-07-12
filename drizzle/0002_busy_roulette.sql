CREATE TABLE "wahaConfigurations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wahaConfigurations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"baseUrl" text NOT NULL,
	"apiKey" text,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wahaConfigurations_name_unique" UNIQUE("name")
);
