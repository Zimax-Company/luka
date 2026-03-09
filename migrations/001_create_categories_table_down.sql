-- Migration: Drop categories table for Luka Categories API
-- Description: Rollback migration to drop the categories table
-- Version: 1.0.0
-- Date: 2026-02-25

-- Drop categories table
DROP TABLE IF EXISTS `categories`;
