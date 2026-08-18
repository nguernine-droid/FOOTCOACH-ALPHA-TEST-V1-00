CREATE TYPE "public"."district_source" AS ENUM('annuaire', 'manuel');--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"legal_name" text,
	"siren" text,
	"city" text,
	"departments" text[] NOT NULL,
	"source" "district_source" NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "districts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "districts_departments_idx" ON "districts" USING gin ("departments");