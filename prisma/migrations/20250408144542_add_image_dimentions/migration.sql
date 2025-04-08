/*
  Warnings:

  - Added the required column `image_height` to the `posts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image_width` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "image_height" INTEGER;
ALTER TABLE "posts" ADD COLUMN     "image_width" INTEGER;

UPDATE "posts"
SET "image_height" = 1000, "image_width" = 1000;

ALTER TABLE "posts" ALTER COLUMN "image_width" SET NOT NULL;
ALTER TABLE "posts" ALTER COLUMN "image_height" SET NOT NULL;
