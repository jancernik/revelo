ALTER TABLE "collection_images" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "collection_images" CASCADE;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "collection_id" uuid;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "collection_order" integer;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_order_index" ON "images" USING btree ("collection_id","collection_order");--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "unique_collection_order" UNIQUE("collection_id","collection_order");