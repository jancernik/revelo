CREATE TABLE "image" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar NOT NULL,
	"mimetype" varchar NOT NULL,
	"path" varchar NOT NULL,
	"size" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
