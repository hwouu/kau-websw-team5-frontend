/*
  Warnings:

  - You are about to drop the column `fileName` on the `upload` table. All the data in the column will be lost.
  - You are about to alter the column `filePath` on the `upload` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `upload` DROP COLUMN `fileName`,
    MODIFY `filePath` JSON NOT NULL;
