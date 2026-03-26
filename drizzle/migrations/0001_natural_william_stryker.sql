CREATE TABLE "optimizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"quality" numeric NOT NULL,
	"width" numeric,
	"user_id" text,
	"session_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "todos" CASCADE;--> statement-breakpoint
ALTER TABLE "optimizations" ADD CONSTRAINT "optimizations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;