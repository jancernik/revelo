ALTER TABLE "images" ADD COLUMN "search_embedding" vector(768);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "search_embedding_model" varchar(100);