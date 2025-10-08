CREATE TYPE "public"."storage_types" AS ENUM('local', 's3');--> statement-breakpoint
ALTER TABLE "image_versions" ADD COLUMN "storage_type" "storage_types" DEFAULT 'local' NOT NULL;