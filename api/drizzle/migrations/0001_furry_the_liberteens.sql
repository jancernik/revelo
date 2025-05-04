CREATE TYPE "public"."image_version_types" AS ENUM('original', 'regular', 'thumbnail');--> statement-breakpoint
CREATE TABLE "image_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_id" serial NOT NULL,
	"mimetype" varchar(100) NOT NULL,
	"size" bigint NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"type" "image_version_types" NOT NULL,
	"path" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_image_version" UNIQUE("image_id","type")
);
--> statement-breakpoint
CREATE TABLE "post_images" (
	"post_id" serial NOT NULL,
	"image_id" serial NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_images_image_id_post_id_pk" PRIMARY KEY("image_id","post_id"),
	CONSTRAINT "unique_order" UNIQUE("image_id","post_id","order")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"description" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "images" RENAME COLUMN "filename" TO "original_filename";--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "iso" integer;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "aperture" varchar(50);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "shutter_speed" varchar(50);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "focal_length" varchar(50);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "camera" varchar(255);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "lens" varchar(255);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "date" timestamp;--> statement-breakpoint
ALTER TABLE "image_versions" ADD CONSTRAINT "image_versions_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" DROP COLUMN "mimetype";--> statement-breakpoint
ALTER TABLE "images" DROP COLUMN "path";--> statement-breakpoint
ALTER TABLE "images" DROP COLUMN "size";