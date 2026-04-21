-- ============================================================
-- KidSafe v3 Migration
-- New feature: Per-Site Time Limits
-- ============================================================

CREATE TABLE IF NOT EXISTS `site_time_limits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `hostname` varchar(255) NOT NULL,
  `limit_minutes` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child_site` (`child_id`, `hostname`),
  CONSTRAINT `site_time_limits_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS `site_time_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `hostname` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `usage_minutes` int(11) NOT NULL DEFAULT 0,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child_site_date` (`child_id`, `hostname`, `date`),
  CONSTRAINT `site_time_usage_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
