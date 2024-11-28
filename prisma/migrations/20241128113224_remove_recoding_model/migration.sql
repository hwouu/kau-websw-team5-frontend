/*
  Warnings:

  - You are about to drop the `recording` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `recording` DROP FOREIGN KEY `Recording_userID_fkey`;

-- DropTable
DROP TABLE IF EXISTS `recording`;
