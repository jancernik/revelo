ALTER TABLE "image_versions" DROP CONSTRAINT "image_versions_image_id_images_id_fk";
--> statement-breakpoint
ALTER TABLE "post_images" DROP CONSTRAINT "post_images_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "post_images" DROP CONSTRAINT "post_images_image_id_images_id_fk";
--> statement-breakpoint
ALTER TABLE "image_versions" ADD CONSTRAINT "image_versions_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;