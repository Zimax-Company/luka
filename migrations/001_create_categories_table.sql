-- Migration: Create categories table for Luka Categories API
-- Description: Creates the categories table with name, type, and audit fields
-- Version: 1.0.0
-- Date: 2026-02-25

-- Create categories table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'Unique identifier for the category',
  `name` VARCHAR(255) NOT NULL COMMENT 'Name of the category',
  `type` ENUM('INCOME', 'EXPENSE') NOT NULL COMMENT 'Category type - INCOME or EXPENSE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the category was created',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When the category was last updated',
  
  -- Indexes
  INDEX `idx_categories_type` (`type`),
  INDEX `idx_categories_name` (`name`),
  INDEX `idx_categories_created_at` (`created_at`),
  
  -- Constraints
  UNIQUE KEY `uk_categories_name_type` (`name`, `type`) COMMENT 'Ensure unique combination of name and type'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Categories for income and expense tracking';

-- Insert default categories
INSERT IGNORE INTO `categories` (`id`, `name`, `type`) VALUES
('1', 'Salary', 'INCOME'),
('2', 'Food', 'EXPENSE'),
('3', 'Freelance', 'INCOME'),
('4', 'Transportation', 'EXPENSE'),
('5', 'Entertainment', 'EXPENSE'),
('6', 'Investment Returns', 'INCOME'),
('7', 'Utilities', 'EXPENSE'),
('8', 'Healthcare', 'EXPENSE');
