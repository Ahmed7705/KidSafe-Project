import pool from "../src/db.js";

async function runMigration() {
  try {
    console.log("Running migration_v4.js...");

    try {
      await pool.query("ALTER TABLE `users` ADD COLUMN `is_admin` BOOLEAN NOT NULL DEFAULT FALSE");
      console.log("Added is_admin column to users table.");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log("is_admin column already exists.");
      } else {
        throw e;
      }
    }

    const hashedPwd = "$2a$10$X8O.U6u3B2Fh3lT9D2l7OuR8K9XQyH/vN/2b1v2jD0tL0X2uH7B.i"; // admin123

    await pool.query(
      `INSERT IGNORE INTO users (email, password_hash, full_name, is_admin)
       VALUES ('admin@kidsafe.com', ?, 'Super Admin', TRUE)`,
      [hashedPwd]
    );

    await pool.query(
      `UPDATE users SET password_hash = ?, is_admin = TRUE WHERE email = 'admin@kidsafe.com'`,
      [hashedPwd]
    );

    console.log("Migration v4 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
