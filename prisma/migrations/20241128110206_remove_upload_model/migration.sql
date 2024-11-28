/*
  Warnings:

  - You are about to drop the `upload` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `upload` DROP FOREIGN KEY `Upload_userID_fkey`;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `fileType` VARCHAR(191) NULL,
    ADD COLUMN `fileUrl` JSON NULL;

-- DropTable
DROP TABLE IF EXISTS `upload`;
