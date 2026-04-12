CREATE TYPE "public"."content_language" AS ENUM('ja', 'ko');--> statement-breakpoint
CREATE TYPE "public"."fetch_status" AS ENUM('pending', 'fetching', 'fetched', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_site" AS ENUM('syosetu');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."translation_status" AS ENUM('queued', 'processing', 'available', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ui_locale" AS ENUM('en', 'ko');--> statement-breakpoint
CREATE TABLE "reader_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"font_size" text DEFAULT 'medium' NOT NULL,
	"line_height" text DEFAULT '1.8' NOT NULL,
	"content_width" text DEFAULT '680' NOT NULL,
	"theme_override" "theme",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"preferred_ui_locale" "ui_locale" DEFAULT 'en' NOT NULL,
	"preferred_reader_language" "content_language" DEFAULT 'ja' NOT NULL,
	"theme" "theme" DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "novels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_site" "source_site" DEFAULT 'syosetu' NOT NULL,
	"source_ncode" text NOT NULL,
	"source_url" text NOT NULL,
	"title_ja" text NOT NULL,
	"title_normalized" text,
	"author_name" text,
	"author_id" text,
	"summary_ja" text,
	"is_completed" boolean,
	"status_raw" text,
	"total_episodes" integer,
	"ranking_snapshot_json" jsonb,
	"source_metadata_json" jsonb,
	"last_source_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novels_source_ncode_unique" UNIQUE("source_ncode")
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"novel_id" uuid NOT NULL,
	"source_episode_id" text NOT NULL,
	"episode_number" integer NOT NULL,
	"title_ja" text,
	"published_at" timestamp with time zone,
	"updated_at_source" timestamp with time zone,
	"source_url" text NOT NULL,
	"raw_html_checksum" text,
	"raw_text_ja" text,
	"normalized_text_ja" text,
	"fetch_status" "fetch_status" DEFAULT 'pending' NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"current_episode_id" uuid NOT NULL,
	"current_language" "content_language" DEFAULT 'ja' NOT NULL,
	"scroll_anchor" text,
	"progress_percent" real,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"target_language" "content_language" NOT NULL,
	"provider" text NOT NULL,
	"model_name" text NOT NULL,
	"prompt_version" text NOT NULL,
	"source_checksum" text NOT NULL,
	"status" "translation_status" DEFAULT 'queued' NOT NULL,
	"translated_text" text,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"payload_json" jsonb,
	"result_json" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reader_preferences" ADD CONSTRAINT "reader_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_current_episode_id_episodes_id_fk" FOREIGN KEY ("current_episode_id") REFERENCES "public"."episodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_novel_source_idx" ON "episodes" USING btree ("novel_id","source_episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_user_novel_idx" ON "reading_progress" USING btree ("user_id","novel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_novel_idx" ON "subscriptions" USING btree ("user_id","novel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "translations_identity_idx" ON "translations" USING btree ("episode_id","target_language","provider","model_name","prompt_version","source_checksum");