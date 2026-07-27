CREATE TABLE "coach_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"related_coach_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coach_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_path" text;--> statement-breakpoint
ALTER TABLE "coach_relations" ADD CONSTRAINT "coach_relations_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_relations" ADD CONSTRAINT "coach_relations_related_coach_id_users_id_fk" FOREIGN KEY ("related_coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coach_relations_pair_idx" ON "coach_relations" USING btree ("coach_id","related_coach_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_coach_code_unique" UNIQUE("coach_code");