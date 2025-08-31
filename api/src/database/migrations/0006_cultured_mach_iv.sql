ALTER TABLE "post_images" RENAME TO "collection_images";--> statement-breakpoint
ALTER TABLE "posts" RENAME TO "collections";--> statement-breakpoint
ALTER TABLE "collection_images" RENAME COLUMN "post_id" TO "collection_id";--> statement-breakpoint
ALTER TABLE "collection_images" DROP CONSTRAINT "unique_order";--> statement-breakpoint
ALTER TABLE "collection_images" DROP CONSTRAINT "post_images_image_id_images_id_fk";
--> statement-breakpoint
ALTER TABLE "collection_images" DROP CONSTRAINT "post_images_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "collection_images" DROP CONSTRAINT "post_images_image_id_post_id_pk";--> statement-breakpoint
ALTER TABLE "collection_images" ADD CONSTRAINT "collection_images_image_id_collection_id_pk" PRIMARY KEY("image_id","collection_id");--> statement-breakpoint
ALTER TABLE "collection_images" ADD CONSTRAINT "collection_images_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_images" ADD CONSTRAINT "collection_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_images" ADD CONSTRAINT "unique_order" UNIQUE("image_id","collection_id","order");