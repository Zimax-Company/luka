-- Initialize the Luka Categories Database
USE luka_categories;

-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('INCOME', 'EXPENSE') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_name (name)
);

-- Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    date DATE NOT NULL,
    note TEXT NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_date (date),
    INDEX idx_category (category_id),
    INDEX idx_amount (amount)
);

-- Insert Sample Categories
INSERT INTO categories (id, name, type) VALUES
('1', 'Salary', 'INCOME'),
('2', 'Food', 'EXPENSE'),
('3', 'Transportation', 'EXPENSE'),
('4', 'Freelance', 'INCOME'),
('5', 'Entertainment', 'EXPENSE'),
('6', 'Utilities', 'EXPENSE'),
('7', 'Investment Returns', 'INCOME'),
('8', 'Healthcare', 'EXPENSE')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    type = VALUES(type),
    updated_at = CURRENT_TIMESTAMP;

-- Insert Sample Transactions
INSERT INTO transactions (id, date, note, category_id, amount) VALUES
('1', '2026-03-14', 'Monthly salary payment', '1', 3500.00),
('2', '2026-03-13', 'Lunch at restaurant', '2', 25.00),
('3', '2026-03-12', 'Gas station fill-up', '3', 45.00),
('4', '2026-03-11', 'Freelance project payment', '4', 800.00),
('5', '2026-03-10', 'Movie tickets', '5', 30.00),
('6', '2026-03-09', 'Electricity bill', '6', 120.00),
('7', '2026-03-08', 'Stock dividend', '7', 150.00),
('8', '2026-03-07', 'Doctor visit', '8', 75.00),
('9', '2026-03-06', 'Grocery shopping', '2', 85.50),
('10', '2026-03-05', 'Bus pass renewal', '3', 50.00)
ON DUPLICATE KEY UPDATE 
    date = VALUES(date),
    note = VALUES(note),
    category_id = VALUES(category_id),
    amount = VALUES(amount),
    updated_at = CURRENT_TIMESTAMP;

-- Create a view for transactions with category information
CREATE OR REPLACE VIEW transactions_with_categories AS
SELECT 
    t.id,
    t.date,
    t.note,
    t.category_id,
    t.amount,
    t.created_at,
    t.updated_at,
    c.name as category_name,
    c.type as category_type
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
ORDER BY t.date DESC, t.created_at DESC;
