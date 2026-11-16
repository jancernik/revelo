CREATE TYPE "public"."description_sources" AS ENUM('generated', 'translated', 'edited');--> statement-breakpoint
CREATE TABLE "image_descriptions" (
	"image_id" uuid NOT NULL,
	"language" varchar(10) NOT NULL,
	"model" varchar(100),
	"source" "description_sources" NOT NULL,
	"text" varchar(500) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "image_descriptions_image_id_language_pk" PRIMARY KEY("image_id","language")
);
--> statement-breakpoint
ALTER TABLE "image_descriptions" ADD CONSTRAINT "image_descriptions_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;