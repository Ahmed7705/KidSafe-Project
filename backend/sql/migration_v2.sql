-- ============================================================
-- KidSafe v2 Migration
-- New features: Multiple guardians, Screen Time, Safe Search,
-- App Management, Emergency Alerts
-- ============================================================

-- 1) Multiple Guardians
CREATE TABLE IF NOT EXISTS `child_guardians` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('primary','guardian') NOT NULL DEFAULT 'guardian',
  `invited_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child_guardian` (`child_id`, `user_id`),
  KEY `user_id` (`user_id`),
  KEY `invited_by` (`invited_by`),
  CONSTRAINT `child_guardians_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  CONSTRAINT `child_guardians_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `child_guardians_ibfk_3` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Backfill existing children → primary guardian
INSERT IGNORE INTO `child_guardians` (`child_id`, `user_id`, `role`)
SELECT `id`, `user_id`, 'primary' FROM `children`;

-- 2) Screen Time Management
CREATE TABLE IF NOT EXISTS `screen_time_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `daily_limit_minutes` int(11) DEFAULT NULL,
  `bedtime_start` time DEFAULT NULL,
  `bedtime_end` time DEFAULT NULL,
  `days_of_week` varchar(20) NOT NULL DEFAULT '0,1,2,3,4,5,6',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child` (`child_id`),
  CONSTRAINT `screen_time_rules_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS `screen_time_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `device_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `usage_minutes` int(11) NOT NULL DEFAULT 0,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child_date` (`child_id`, `date`),
  KEY `device_id` (`device_id`),
  CONSTRAINT `screen_time_usage_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  CONSTRAINT `screen_time_usage_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 3) Safe Search Settings
CREATE TABLE IF NOT EXISTS `safe_search_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `google_safe_search` tinyint(1) NOT NULL DEFAULT 1,
  `youtube_restricted` tinyint(1) NOT NULL DEFAULT 1,
  `bing_safe_search` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child` (`child_id`),
  CONSTRAINT `safe_search_settings_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 4) App & Game Management
CREATE TABLE IF NOT EXISTS `app_recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `url` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `min_age` int(11) NOT NULL DEFAULT 0,
  `max_age` int(11) NOT NULL DEFAULT 18,
  `category` enum('education','entertainment','games','social','tools') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS `child_app_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `block_gaming_sites` tinyint(1) NOT NULL DEFAULT 0,
  `block_app_stores` tinyint(1) NOT NULL DEFAULT 0,
  `block_in_app_purchases` tinyint(1) NOT NULL DEFAULT 1,
  `max_game_time_minutes` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child` (`child_id`),
  CONSTRAINT `child_app_settings_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Seed app recommendations
INSERT INTO `app_recommendations` (`name`, `url`, `description`, `min_age`, `max_age`, `category`) VALUES
('Khan Academy Kids', 'https://www.khanacademy.org/kids', 'Free educational platform for young learners', 3, 8, 'education'),
('Khan Academy', 'https://www.khanacademy.org', 'Comprehensive educational platform for all ages', 8, 18, 'education'),
('Duolingo', 'https://www.duolingo.com', 'Learn languages through interactive lessons', 6, 18, 'education'),
('Scratch', 'https://scratch.mit.edu', 'Learn programming with visual blocks', 7, 16, 'education'),
('Code.org', 'https://code.org', 'Free coding lessons and activities', 6, 18, 'education'),
('National Geographic Kids', 'https://kids.nationalgeographic.com', 'Science, nature and geography for kids', 5, 14, 'education'),
('PBS Kids', 'https://pbskids.org', 'Educational games and videos', 3, 8, 'entertainment'),
('NASA Kids Club', 'https://www.nasa.gov/stem/forstudents/k-4/index.html', 'Space exploration and science activities', 5, 14, 'education'),
('Coolmath Games', 'https://www.coolmathgames.com', 'Math-based educational games', 6, 14, 'games'),
('ABCmouse', 'https://www.abcmouse.com', 'Early learning academy for young children', 3, 8, 'education'),
('Google Arts & Culture', 'https://artsandculture.google.com', 'Explore art and culture from around the world', 8, 18, 'education'),
('Typing Club', 'https://www.typingclub.com', 'Learn touch typing for free', 7, 18, 'tools');

-- 5) Enhanced Alerts
ALTER TABLE `alerts`
  MODIFY `alert_type` enum('blocked','malicious','suspicious','emergency','screen_time') NOT NULL;
