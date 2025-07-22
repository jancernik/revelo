CREATE INDEX "search_index" ON "images" USING gin ((
          setweight(to_tsvector('english', coalesce("caption", '')), 'A') ||
          setweight(to_tsvector('english', coalesce("camera", '')), 'B') ||
          setweight(to_tsvector('english', coalesce("lens", '')), 'B')
        ));