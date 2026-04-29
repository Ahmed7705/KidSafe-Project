import pool from './src/db.js';

const today = new Date().toISOString().slice(0, 10);
console.log('JS today (UTC):', today);

const [test] = await pool.query(
  'SELECT ? as js_today, CURDATE() as db_today, DATE(NOW()) as date_now',
  [today]
);
console.log('Date comparison:', JSON.stringify(test));

// Try to manually insert and see what date gets stored
const [insertTest] = await pool.query(
  `INSERT INTO site_time_usage (child_id, hostname, date, usage_minutes, first_activity_at, last_activity_at)
   VALUES (13, 'youtube.com', ?, 1, NOW(), NOW())
   ON DUPLICATE KEY UPDATE
     usage_minutes = usage_minutes + IF(TIMESTAMPDIFF(SECOND, last_activity_at, NOW()) >= 50, 1, 0),
     last_activity_at = IF(TIMESTAMPDIFF(SECOND, last_activity_at, NOW()) >= 50, NOW(), last_activity_at)`,
  [today]
);
console.log('Insert result (affectedRows):', insertTest.affectedRows);

const [after] = await pool.query(
  'SELECT id, hostname, date, usage_minutes, DATE_FORMAT(date, "%Y-%m-%d") as formatted_date FROM site_time_usage WHERE child_id = 13 AND hostname = ? ORDER BY date DESC',
  ['youtube.com']
);
console.log('YouTube records after insert:', JSON.stringify(after, null, 2));

// Cleanup
await pool.query("DELETE FROM site_time_usage WHERE hostname = 'youtube.com' AND child_id = 13 AND date = ?", [today]);
console.log('Cleaned up test record');

process.exit(0);
