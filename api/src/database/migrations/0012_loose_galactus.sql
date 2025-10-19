DROP INDEX IF EXISTS search_index;

DROP INDEX IF EXISTS embedding_index;

ALTER TABLE images
  ADD COLUMN IF NOT EXISTS captions JSONB;

ALTER TABLE images
  DROP COLUMN IF EXISTS caption;

ALTER TABLE images
  DROP COLUMN IF EXISTS embedding;

ALTER TABLE images
  ADD COLUMN embedding vector(512);

CREATE INDEX IF NOT EXISTS search_index ON images USING GIN ((
  setweight(to_tsvector('english', coalesce((captions ->> 'en'), '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce((captions ->> 'es'), '')), 'A') ||
  setweight(to_tsvector('english', coalesce(comment, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(comment, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(camera, '')), 'C') ||
  setweight(to_tsvector('spanish', coalesce(camera, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(lens, '')), 'C') ||
  setweight(to_tsvector('spanish', coalesce(lens, '')), 'C')
));

CREATE INDEX IF NOT EXISTS embedding_index
  ON images USING hnsw (embedding vector_cosine_ops);
