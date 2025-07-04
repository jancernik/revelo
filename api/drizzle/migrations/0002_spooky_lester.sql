CREATE TABLE "email_verification_tokens" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;