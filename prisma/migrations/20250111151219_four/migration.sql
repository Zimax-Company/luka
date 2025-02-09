/*
  Warnings:

  - You are about to drop the column `amount` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_date` on the `Category` table. All the data in the column will be lost.
  - You are about to alter the column `created_at` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `deleted_at` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to drop the column `categoryId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `transaction_date` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `deleted_at` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - Added the required column `name` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Transaction` DROP FOREIGN KEY `Transaction_categoryId_fkey`;

-- DropIndex
DROP INDEX `Transaction_categoryId_fkey` ON `Transaction`;

-- AlterTable
ALTER TABLE `Category` DROP COLUMN `amount`,
    DROP COLUMN `transaction_date`,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    MODIFY `type` CHAR(12) NOT NULL,
    MODIFY `created_at` TIMESTAMP NOT NULL,
    MODIFY `updated_at` TIMESTAMP NULL,
    MODIFY `deleted_at` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `Transaction` DROP COLUMN `categoryId`,
    ADD COLUMN `category_id` VARCHAR(191) NOT NULL,
    MODIFY `transaction_date` TIMESTAMP NOT NULL,
    MODIFY `created_at` TIMESTAMP NOT NULL,
    MODIFY `updated_at` TIMESTAMP NULL,
    MODIFY `deleted_at` TIMESTAMP NULL;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
