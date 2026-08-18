CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"name" text NOT NULL,
	"pitch_name" text,
	"search_name" text NOT NULL,
	"address" text,
	"postal_code" text,
	"city" text NOT NULL,
	"department" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"surface" text,
	"floodlit" boolean,
	"changing_rooms" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE INDEX "venues_lat_idx" ON "venues" USING btree ("lat");--> statement-breakpoint
CREATE INDEX "venues_lng_idx" ON "venues" USING btree ("lng");--> statement-breakpoint
CREATE INDEX "venues_search_idx" ON "venues" USING btree ("search_name");