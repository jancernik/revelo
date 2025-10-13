DROP INDEX "search_index";--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "comment" varchar(1000);--> statement-breakpoint
CREATE INDEX "search_index" ON "images" USING gin ((
          setweight(to_tsvector('english', coalesce("caption", '')), 'A') ||
          setweight(to_tsvector('english', coalesce("comment", '')), 'B') ||
          setweight(to_tsvector('english', coalesce("camera", '')), 'C') ||
          setweight(to_tsvector('english', coalesce("lens", '')), 'C')
        ));