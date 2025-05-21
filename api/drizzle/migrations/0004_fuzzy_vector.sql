ALTER TABLE "images" ADD COLUMN "embedding" vector(512);--> statement-breakpoint
CREATE INDEX "embedding_index" ON "images" USING hnsw ("embedding" vector_cosine_ops);