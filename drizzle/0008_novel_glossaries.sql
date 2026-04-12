CREATE TABLE IF NOT EXISTS "novel_glossaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"novel_id" uuid NOT NULL,
	"glossary" text DEFAULT '' NOT NULL,
	"model_name" text,
	"episode_count" integer,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_glossaries_novel_id_unique" UNIQUE("novel_id")
);
--> statement-breakpoint
ALTER TABLE "novel_glossaries" ADD CONSTRAINT "novel_glossaries_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;
