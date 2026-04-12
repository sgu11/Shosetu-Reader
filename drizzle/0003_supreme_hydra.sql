CREATE TABLE "title_translation_cache" (
	"title_ja" text PRIMARY KEY NOT NULL,
	"title_ko" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
