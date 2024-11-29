/*
  Warnings:

  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `reports` DROP FOREIGN KEY `Reports_user_id_fkey`;

-- DropTable
DROP TABLE `reports`;

-- CreateTable
CREATE TABLE `Report` (
    `report_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `time` TIME NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `accident_type` JSON NULL,
    `damaged_situation` JSON NULL,
    `number_of_vehicle` INTEGER NOT NULL,
    `vehicle` JSON NULL,
    `description` VARCHAR(191) NULL,
    `fileUrl` JSON NULL,
    `fileType` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`report_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`userID`) ON DELETE RESTRICT ON UPDATE CASCADE;
