ALTER TABLE "collection_images" DROP CONSTRAINT IF EXISTS "collection_images_collection_id_collections_id_fk";

ALTER TABLE "collections" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();

ALTER TABLE "collection_images" ADD COLUMN "new_collection_id" uuid;
UPDATE "collection_images" SET "new_collection_id" = "collections"."new_id" 
FROM "collections" WHERE "collection_images"."collection_id" = "collections"."id";

ALTER TABLE "collection_images" DROP COLUMN "collection_id";
ALTER TABLE "collections" DROP COLUMN "id";

ALTER TABLE "collections" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "collection_images" RENAME COLUMN "new_collection_id" TO "collection_id";

ALTER TABLE "collections" ADD PRIMARY KEY ("id");
ALTER TABLE "collections" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "collection_images" ALTER COLUMN "collection_id" SET NOT NULL;

ALTER TABLE "collection_images" 
  ADD CONSTRAINT "collection_images_collection_id_collections_id_fk" 
  FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE cascade;