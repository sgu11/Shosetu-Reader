ALTER TABLE "translations" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "estimated_cost_usd" real;