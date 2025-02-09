-- CreateTable
CREATE TABLE `Transaction` (
    `_id` INTEGER NOT NULL AUTO_INCREMENT,
    `id` VARCHAR(191) NOT NULL,
    `type` CHAR(2) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `transaction_date` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP NOT NULL,
    `updated_at` TIMESTAMP NULL,
    `deleted_at` TIMESTAMP NULL,

    UNIQUE INDEX `Transaction_id_key`(`id`),
    INDEX `Transaction_id_idx`(`id`),
    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
