-- ============================================================
-- KidSafe v4 Migration
-- New feature: Super Admin Role
-- ============================================================

-- Add is_admin column to users table if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "is_admin";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " BOOLEAN NOT NULL DEFAULT FALSE;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create default admin user (password is 'admin123' hashed with bcrypt)
-- Using INSERT IGNORE to prevent duplicate error if run multiple times
INSERT IGNORE INTO `users` (`email`, `password_hash`, `full_name`, `is_admin`)
VALUES ('admin@kidsafe.com', '$2a$10$7zB3c9NnO1E0eZ3p2kF0qO2W7.j1h9V8pZ4m1E0eZ3p2kF0qO2W7.', 'Super Admin', TRUE);

-- Update the hashed password to ensure it is correctly generated for 'admin123'
-- Hash for 'admin123' using bcrypt
UPDATE `users` 
SET `password_hash` = '$2a$10$LU7SkN9Smtlj87Wcy0BC5ePfcy6a4AcG8y5r7vDSxLQZTHHNDIzRC' 
WHERE `email` = 'admin@kidsafe.com';
