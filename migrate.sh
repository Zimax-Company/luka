#!/bin/bash

# Migration Script for Luka Categories API
# Provides utilities to run database migrations for MySQL

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-luka_categories}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
MIGRATIONS_DIR="./migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if MySQL is available
check_mysql() {
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL client is not installed or not in PATH"
        exit 1
    fi
}

# Function to test database connection
test_connection() {
    print_status "Testing database connection..."
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} -e "SELECT 1;" &> /dev/null; then
        print_status "Database connection successful"
    else
        print_error "Cannot connect to database. Please check your connection parameters."
        exit 1
    fi
}

# Function to create database if it doesn't exist
create_database() {
    print_status "Creating database '$DB_NAME' if it doesn't exist..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
}

# Function to run migration up
migrate_up() {
    print_status "Running migrations..."
    
    for migration_file in "$MIGRATIONS_DIR"/*_up.sql "$MIGRATIONS_DIR"/[0-9][0-9][0-9]_*.sql; do
        if [[ -f "$migration_file" && ! "$migration_file" == *"_down.sql" ]]; then
            filename=$(basename "$migration_file")
            print_status "Applying migration: $filename"
            
            mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" < "$migration_file"
            
            if [ $? -eq 0 ]; then
                print_status "✓ Migration $filename applied successfully"
            else
                print_error "✗ Failed to apply migration $filename"
                exit 1
            fi
        fi
    done
}

# Function to run migration down
migrate_down() {
    print_warning "Running rollback migrations..."
    print_warning "This will DESTROY DATA. Are you sure? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        for migration_file in $(ls -r "$MIGRATIONS_DIR"/*_down.sql 2>/dev/null || true); do
            if [[ -f "$migration_file" ]]; then
                filename=$(basename "$migration_file")
                print_status "Rolling back migration: $filename"
                
                mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" < "$migration_file"
                
                if [ $? -eq 0 ]; then
                    print_status "✓ Migration $filename rolled back successfully"
                else
                    print_error "✗ Failed to rollback migration $filename"
                    exit 1
                fi
            fi
        done
    else
        print_status "Rollback cancelled"
    fi
}

# Function to show database status
show_status() {
    print_status "Database Status:"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo ""
    
    print_status "Tables in database:"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null || print_warning "Could not list tables"
    
    print_status "Categories table structure:"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" -e "DESCRIBE categories;" 2>/dev/null || print_warning "Categories table does not exist"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  up      Run all pending migrations"
    echo "  down    Rollback all migrations (DESTRUCTIVE)"
    echo "  status  Show database and migration status"
    echo "  test    Test database connection"
    echo "  help    Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST     Database host (default: localhost)"
    echo "  DB_PORT     Database port (default: 3306)"
    echo "  DB_NAME     Database name (default: luka_categories)"
    echo "  DB_USER     Database user (default: root)"
    echo "  DB_PASSWORD Database password (default: empty)"
    echo ""
    echo "Examples:"
    echo "  $0 up                                # Run migrations with defaults"
    echo "  DB_PASSWORD=secret $0 up             # Run with password"
    echo "  DB_HOST=prod.db.com $0 status        # Check production status"
}

# Main script logic
case "${1:-help}" in
    "up")
        check_mysql
        test_connection
        create_database
        migrate_up
        print_status "All migrations completed successfully!"
        ;;
    "down")
        check_mysql
        test_connection
        migrate_down
        print_status "Rollback completed!"
        ;;
    "status")
        check_mysql
        test_connection
        show_status
        ;;
    "test")
        check_mysql
        test_connection
        print_status "Database connection test successful!"
        ;;
    "help"|*)
        show_usage
        ;;
esac
