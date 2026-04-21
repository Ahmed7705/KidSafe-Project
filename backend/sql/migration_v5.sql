-- ============================================================
-- KidSafe v5 Migration
-- New feature: Dynamic App Recommendations
-- ============================================================

CREATE TABLE IF NOT EXISTS `app_recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `url` varchar(255) DEFAULT NULL,
  `min_age` int(11) DEFAULT 0,
  `max_age` int(11) DEFAULT 99,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Insert default recommendations (only if the table is empty to prevent duplicates on rerun)
INSERT INTO `app_recommendations` (`name`, `description`, `category`, `url`, `min_age`, `max_age`)
SELECT * FROM (
  SELECT 'PBS Kids' as name, 'Educational games and videos' as description, 'education' as category, 'https://pbskids.org' as url, 3 as min_age, 8 as max_age UNION ALL
  SELECT 'Khan Academy Kids', 'Free educational app for young learners', 'education', 'https://learn.khanacademy.org/khan-academy-kids/', 2, 8 UNION ALL
  SELECT 'Duolingo', 'Learn languages for free', 'education', 'https://www.duolingo.com/', 7, 18 UNION ALL
  SELECT 'Scratch', 'Learn to code through visual blocks', 'education', 'https://scratch.mit.edu/', 8, 16 UNION ALL
  SELECT 'National Geographic Kids', 'Learn about animals, science, and the world', 'education', 'https://kids.nationalgeographic.com/', 6, 14 UNION ALL
  SELECT 'YouTube Kids', 'A safer online experience for kids', 'entertainment', 'https://www.youtubekids.com/', 3, 12 UNION ALL
  SELECT 'Disney+', 'Movies and shows from Disney, Pixar, Marvel', 'entertainment', 'https://www.disneyplus.com/', 4, 18 UNION ALL
  SELECT 'Roblox', 'A global platform that brings people together through play', 'games', 'https://www.roblox.com/', 10, 18 UNION ALL
  SELECT 'Minecraft', 'Explore your own unique world, survive the night, and create anything you can imagine', 'games', 'https://www.minecraft.net/', 8, 18
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM `app_recommendations` LIMIT 1
);
