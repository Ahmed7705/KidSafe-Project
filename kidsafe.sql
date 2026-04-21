-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 27, 2026 at 04:09 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kidsafe`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `device_id` int(11) DEFAULT NULL,
  `url` text NOT NULL,
  `hostname` varchar(255) DEFAULT NULL,
  `verdict` enum('allowed','blocked','malicious') NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `child_id`, `device_id`, `url`, `hostname`, `verdict`, `reason`, `created_at`) VALUES
(1, 1, 1, 'https://instagram.com/', 'instagram.com', 'blocked', 'Matched domain rule: instagram.com', '2026-01-09 21:09:25'),
(2, 1, 1, 'https://www.google.com/search?q=%D9%83%D9%88%D8%B1%D8%B3%D9%8A%D8%B1%D8%A7&sca_esv=3347164baf623f1a&sxsrf=ANbL-n45SoodiQjW9koBs83EbkN003-bUA%3A1767987236799&ei=JFhhadK5MN24i-gP38at8QM&gs_ssp=eJzj4tLP1TfIssxOSqpSYDRgdGDw4rvZfLPjxsYbm292AcnlALf5DoI&oq=%D9%83%D9%88%D8%B1%D8%B3%D9%8A&gs_lp=Egxnd3Mtd2l6LXNlcnAaAhgCIgrZg9mI2LHYs9mKKgIIADILEC4YgAQY0QMYxwEyCBAAGIAEGMsBMggQABiABBjLATIIEC4YgAQYywEyCBAAGIAEGMsBMgUQABiABDIFEAAYgAQyBRAAGIAEMggQABiABBjLATIFEAAYgAQyGhAuGIAEGNEDGMcBGJcFGNwEGN4EGOAE2AEBSKvG3wJQ5wJYr7ffAnACeAGQAQCYAaYCoAGXF6oBBTAuNy43uAEDyAEA-AEC-AEBmAIRoALXJ8ICChAAGLADGNYEGEfCAgcQABiABBgNwgIEECMYJ8ICBRAuGIAEwgIUEC4YgAQYlwUY3AQY3gQY4ATYAQHCAgkQABiABBgKGAvCAgkQLhiABBgKGAuYAwCIBgGQBgi6BgYIARABGBSSBwwyLjMuMTAuMS43LTGgB9NnsgcIMC4zLjEwLjG4B9EYwgcIMi01LjExLjHIB7UBgAgA&sclient=gws-wiz-serp', 'www.google.com', 'allowed', 'No matches', '2026-01-09 21:10:32'),
(3, 1, 1, 'https://www.coursera.org/courseraplus?utm_medium=sem&utm_source=gg&utm_campaign=b2c_emea_x_coursera_ftcof_courseraplus_cx_dr_bau_gg_sem_bd-ex_s4_en_m_hyb_24-10_x&campaignid=21836581623&adgroupid=351685085270&device=c&keyword=coursea&matchtype=e&network=g&devicemodel=&creativeid=1449957450663&assetgroupid=&targetid=kwd-768107498&extensionid=&placement=&gad_source=1&gad_campaignid=21836581623&gbraid=0AAAAADdKX6ZlNKqdbxKBflHPlrsAFKZ5l&gclid=CjwKCAiA64LLBhBhEiwA-Pxgu4ndDMtCR9DJ8lUq7EFASxyqIQKXHrJGJmCU9asJWPFhYeCrfbl3VBoCo6EQAvD_BwE', 'www.coursera.org', 'allowed', 'No matches', '2026-01-09 21:10:34'),
(4, 1, 1, 'https://www.google.com/aclk?sa=L&pf=1&ai=DChsSEwjyrbifr_-RAxXsm4MHHabpB0EYACICCAEQABoCZWY&co=1&ase=2&gclid=CjwKCAiA64LLBhBhEiwA-Pxgu4ndDMtCR9DJ8lUq7EFASxyqIQKXHrJGJmCU9asJWPFhYeCrfbl3VBoCo6EQAvD_BwE&cid=CAASuwHkaF88G7kTBuZI1Jk_1-_rkeTh62PM70EtDhLe43eB5-7e-2cGYPcsABGr1iYAmINfDJzlys3c1ywnHVbq263sDDTvCTtPA4B59rmxHiCJE30ZhBDWCXCrT6MRhm2-hopT5MU_WjbL5sAvbSA9hGr1KkoXOb4Twn7Kj-MUiNyfTbaEMccfEQ5rdYqB9lbZqtFffsoTnJEZrX6Y5PNPmvLzXABAoMimS3Hqp4oTeDoSHMKZNBFTyu8csc7g&cce=2&category=acrcp_v1_32&sig=AOD64_3aJ4e0Ci6zLInsVv5bEDczlYK32A&q&nis=6&ch=1&adurl=https://www.coursera.org/courseraplus?utm_medium%3Dsem%26utm_source%3Dgg%26utm_campaign%3Db2c_emea_x_coursera_ftcof_courseraplus_cx_dr_bau_gg_sem_bd-ex_s4_en_m_hyb_24-10_x%26campaignid%3D21836581623%26adgroupid%3D351685085270%26device%3Dc%26keyword%3Dcoursea%26matchtype%3De%26network%3Dg%26devicemodel%3D%26creativeid%3D1449957450663%26assetgroupid%3D%26targetid%3Dkwd-768107498%26extensionid%3D%26placement%3D%26gad_source%3D1%26gad_campaignid%3D21836581623%26gbraid%3D0AAAAADdKX6ZlNKqdbxKBflHPlrsAFKZ5l%26gclid%3DCjwKCAiA64LLBhBhEiwA-Pxgu4ndDMtCR9DJ8lUq7EFASxyqIQKXHrJGJmCU9asJWPFhYeCrfbl3VBoCo6EQAvD_BwE&ved=2ahUKEwi84bKfr_-RAxXS8bsIHRAcHKsQ0Qx6BAgXEAE', 'www.google.com', 'allowed', 'No matches', '2026-01-09 21:10:34'),
(5, 1, 1, 'https://www.coursera.org/courseraplus?utm_medium=sem&utm_source=gg&utm_campaign=b2c_emea_x_coursera_ftcof_courseraplus_cx_dr_bau_gg_sem_bd-ex_s4_en_m_hyb_24-10_x&campaignid=21836581623&adgroupid=351685085270&device=c&keyword=coursea&matchtype=e&network=g&devicemodel=&creativeid=1449957450663&assetgroupid=&targetid=kwd-768107498&extensionid=&placement=&gad_source=1&gad_campaignid=21836581623&gbraid=0AAAAADdKX6ZlNKqdbxKBflHPlrsAFKZ5l&gclid=CjwKCAiA64LLBhBhEiwA-Pxgu4ndDMtCR9DJ8lUq7EFASxyqIQKXHrJGJmCU9asJWPFhYeCrfbl3VBoCo6EQAvD_BwE', 'www.coursera.org', 'allowed', 'No matches', '2026-01-09 21:10:34'),
(6, 1, 1, 'https://www.coursera.org/', 'www.coursera.org', 'allowed', 'No matches', '2026-01-09 21:10:34'),
(7, 1, 1, 'https://instagram.com/', 'instagram.com', 'blocked', 'Matched domain rule: instagram.com', '2026-01-09 21:11:00'),
(8, 1, 1, 'https://gemini.google.com/app', 'gemini.google.com', 'allowed', 'No matches', '2026-01-09 21:48:26'),
(9, 1, 1, 'https://translate.google.com/?hl=ar', 'translate.google.com', 'allowed', 'No matches', '2026-01-09 23:39:01'),
(10, 1, 1, 'https://www.google.com/search?gs_ssp=eJzj4tLP1TfIssxOSqpSYDRgdGDw4rvZfLPjxsYbm292AcnlALf5DoI&q=%D9%83%D9%88%D8%B1%D8%B3%D9%8A%D8%B1%D8%A7&oq=&gs_lcrp=EgZjaHJvbWUqDwgCEC4YJxjHARjqAhjRAzIJCAAQIxgnGOoCMgkIARAjGCcY6gIyDwgCEC4YJxjHARjqAhjRAzIJCAMQIxgnGOoCMgkIBBAjGCcY6gIyCQgFECMYJxjqAjIJCAYQIxgnGOoCMgkIBxAjGCcY6gLSAQoxOTc2NTZqMGo3qAIIsAIB8QWO4Kf1ty6MEvEFjuCn9bcujBI&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-01-09 23:42:18'),
(11, 1, 1, 'https://www.google.com/search?gs_ssp=eJzj4tLP1TfIssxOSqpSYDRgdGDw4rvZfLPjxsYbm292AcnlALf5DoI&q=%D9%83%D9%88%D8%B1%D8%B3%D9%8A%D8%B1%D8%A7&oq=&gs_lcrp=EgZjaHJvbWUqDwgCEC4YJxjHARjqAhjRAzIJCAAQIxgnGOoCMgkIARAjGCcY6gIyDwgCEC4YJxjHARjqAhjRAzIJCAMQIxgnGOoCMgkIBBAjGCcY6gIyCQgFECMYJxjqAjIJCAYQIxgnGOoCMgkIBxAjGCcY6gLSAQoxOTc2NTZqMGo3qAIIsAIB8QWO4Kf1ty6MEvEFjuCn9bcujBI&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-01-09 23:42:18'),
(12, 1, 1, 'https://www.google.com/aclk?sa=L&pf=1&ai=DChsSEwjBruiT0f-RAxXbQEECHZ71J2IYACICCAEQABoCd3M&co=1&ase=2&gclid=CjwKCAiA64LLBhBhEiwA-Pxgu-dN1dO3Si9mlGdj7bBiVKA8fj2L6_3YVV7_DYp0QXoRENAeybF1lxoCvMYQAvD_BwE&cid=CAASuwHkaADgLShZY7qXQeBaAb5p8A5iqCi0D-Ev3s6iKJBN4Pyz_vzHnNxndblnp2BZl4ZflXLk6J4Kq5-4AwoYSw61St_MXdnbr5E2yoexmwE0ubFW-WnMWt3T0YTPFD6NTJc51fpl9Ih-SuGIReMklSazTpATpTCJYerkN7278iARR_XSWUTBy6TPn-V842IJiHWYmrgAy8kThCCNUCRgSDBHX-f0dDV9iGwEgwjNo9aQAPsJ5qU0lFUv6blP&cce=2&category=acrcp_v1_32&sig=AOD64_15ljRWBNSOpmvi54R3EYsaLDxW4A&q&nis=6&ch=1&adurl=https://www.coursera.org/courseraplus?utm_medium%3Dsem%26utm_source%3Dgg%26utm_campaign%3Db2c_emea_x_coursera_ftcof_courseraplus_cx_dr_bau_gg_sem_bd-ex_s4_en_m_hyb_24-10_x%26campaignid%3D21836581623%26adgroupid%3D351685085270%26device%3Dc%26keyword%3Dcoursea%26matchtype%3De%26network%3Dg%26devicemodel%3D%26creativeid%3D1449957450663%26assetgroupid%3D%26targetid%3Dkwd-768107498%26extensionid%3D%26placement%3D%26gad_source%3D1%26gad_campaignid%3D21836581623%26gbraid%3D0AAAAADdKX6ZlNKqdbxKBflHPlrsAFKZ5l%26gclid%3DCjwKCAiA64LLBhBhEiwA-Pxgu-dN1dO3Si9mlGdj7bBiVKA8fj2L6_3YVV7_DYp0QXoRENAeybF1lxoCvMYQAvD_BwE&ved=2ahUKEwj43eOT0f-RAxWecaQEHaY0FOwQ0Qx6BAgXEAE', 'www.google.com', 'allowed', 'No matches', '2026-01-09 23:42:18'),
(13, 1, 1, 'https://www.coursera.org/courseraplus?utm_medium=sem&utm_source=gg&utm_campaign=b2c_emea_x_coursera_ftcof_courseraplus_cx_dr_bau_gg_sem_bd-ex_s4_en_m_hyb_24-10_x&campaignid=21836581623&adgroupid=351685085270&device=c&keyword=coursea&matchtype=e&network=g&devicemodel=&creativeid=1449957450663&assetgroupid=&targetid=kwd-768107498&extensionid=&placement=&gad_source=1&gad_campaignid=21836581623&gbraid=0AAAAADdKX6ZlNKqdbxKBflHPlrsAFKZ5l&gclid=CjwKCAiA64LLBhBhEiwA-Pxgu-dN1dO3Si9mlGdj7bBiVKA8fj2L6_3YVV7_DYp0QXoRENAeybF1lxoCvMYQAvD_BwE', 'www.coursera.org', 'allowed', 'No matches', '2026-01-09 23:42:25'),
(14, 1, 1, 'https://instagram.com/', 'instagram.com', 'blocked', 'Matched domain rule: instagram.com', '2026-01-09 23:42:29'),
(15, 1, 1, 'https://www.google.com/search?gs_ssp=eJzj4tTP1TewzEouKzZg9OK52XWz48YqMLkCAH0NDA8&q=%D9%8A%D9%88%D8%AA%D9%8A%D9%88%D8%A8&oq=%D9%8A&gs_lcrp=EgZjaHJvbWUqEwgBEC4YiwMYnQMYqAMY0gMYgAQyBggAEEUYOTITCAEQLhiLAxidAxioAxjSAxiABDIKCAIQABiLAxiABDIKCAMQABiLAxiABDIWCAQQLhjHARiLAxioAxjRAxjSAxiABDIKCAUQABiLAxiABDIHCAYQBRiLAzIGCAcQRRg80gEINDUwMWoxajeoAgCwAgA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-01-09 23:43:10'),
(16, 1, 1, 'https://www.google.com/search?gs_ssp=eJzj4tTP1TewzEouKzZg9OK52XWz48YqMLkCAH0NDA8&q=%D9%8A%D9%88%D8%AA%D9%8A%D9%88%D8%A8&oq=%D9%8A&gs_lcrp=EgZjaHJvbWUqEwgBEC4YiwMYnQMYqAMY0gMYgAQyBggAEEUYOTITCAEQLhiLAxidAxioAxjSAxiABDIKCAIQABiLAxiABDIKCAMQABiLAxiABDIWCAQQLhjHARiLAxioAxjRAxjSAxiABDIKCAUQABiLAxiABDIHCAYQBRiLAzIGCAcQRRg80gEINDUwMWoxajeoAgCwAgA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-01-09 23:43:10'),
(17, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'allowed', 'No matches', '2026-01-09 23:43:12'),
(18, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'allowed', 'No matches', '2026-01-09 23:43:13'),
(19, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'allowed', 'No matches', '2026-01-09 23:43:17'),
(20, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'blocked', 'Matched domain rule: youtube.com', '2026-01-09 23:44:12'),
(21, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'blocked', 'Matched domain rule: youtube.com', '2026-01-09 23:44:31'),
(22, 1, 1, 'https://www.google.com/search?q=%D9%8A%D9%88%D8%AA%D9%8A%D9%88%D8%A8&oq=%D9%8A&gs_lcrp=EgZjaHJvbWUqCQgAECMYJxjjAjIJCAAQIxgnGOMCMgYIARAuGCcyBggCEEUYOTIHCAMQABiABDIHCAQQABiABDINCAUQLhjHARjRAxiABDIGCAYQBRhAMgYIBxBFGDzSAQc4NzFqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-01-09 23:44:48'),
(23, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'blocked', 'Matched domain rule: youtube.com', '2026-01-09 23:44:48'),
(24, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'blocked', 'Matched domain rule: youtube.com', '2026-01-09 23:44:48'),
(25, 1, 1, 'https://www.youtube.com/?app=desktop&hl=ar', 'www.youtube.com', 'blocked', 'Matched domain rule: youtube.com', '2026-01-09 23:44:48'),
(26, 1, 1, 'https://www.google.com/search?q=%D9%8A%D9%88%D8%AA%D9%8A%D9%88%D8%A8&oq=%D9%8A&gs_lcrp=EgZjaHJvbWUqCQgAECMYJxjjAjIJCAAQIxgnGOMCMgYIARAuGCcyBggCEEUYOTIHCAMQABiABDIHCAQQABiABDINCAUQLhjHARjRAxiABDIGCAYQBRhAMgYIBxBFGDzSAQc4NzFqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-01-09 23:44:52'),
(27, 1, 1, 'https://www.google.com/search/warmup.html', 'www.google.com', 'allowed', 'No matches', '2026-03-21 20:47:01'),
(28, 1, 1, 'https://www.google.com/search?q=instagram&oq=ins&gs_lcrp=EgZjaHJvbWUqBwgBEAAYjwIyBggAEEUYOTIHCAEQABiPAjIHCAIQABiPAjIHCAMQABiPAtIBCDE4NTBqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-03-21 20:47:03'),
(29, 1, 1, 'https://www.google.com/search?q=instagram&oq=ins&gs_lcrp=EgZjaHJvbWUqBwgBEAAYjwIyBggAEEUYOTIHCAEQABiPAjIHCAIQABiPAjIHCAMQABiPAtIBCDE4NTBqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-03-21 20:47:40'),
(30, 1, 1, 'https://www.google.com/search?q=instagram&oq=ins&gs_lcrp=EgZjaHJvbWUqBwgBEAAYjwIyBggAEEUYOTIHCAEQABiPAjIHCAIQABiPAjIHCAMQABiPAtIBCDE4NTBqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-03-21 20:47:46'),
(31, 1, 1, 'https://www.google.com/search?q=instagram&oq=ins&gs_lcrp=EgZjaHJvbWUqBwgBEAAYjwIyBggAEEUYOTIHCAEQABiPAjIHCAIQABiPAjIHCAMQABiPAtIBCDE4NTBqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8', 'www.google.com', 'allowed', 'No matches', '2026-03-21 20:47:46'),
(32, 1, 1, 'https://www.google.com/search?q=instagram&oq=ins&gs_lcrp=EgZjaHJvbWUqBwgBEAAYjwIyBggAEEUYOTIHCAEQABiPAjIHCAIQABiPAjIHCAMQABiPAtIBCDE4NTBqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8&sei=8R-_aYbWHY-jkdUPsNzmqQc', 'www.google.com', 'allowed', 'No matches', '2026-03-21 20:47:49'),
(33, 1, 1, 'https://www.instagram.com/?hl=en', 'www.instagram.com', 'blocked', 'Matched domain rule: instagram.com', '2026-03-21 20:47:51'),
(34, 1, 1, 'https://www.instagram.com/accounts/login/?hl=en', 'www.instagram.com', 'blocked', 'Matched domain rule: instagram.com', '2026-03-21 20:47:51'),
(35, 1, 1, 'https://www.instagram.com/?hl=en', 'www.instagram.com', 'blocked', 'Matched domain rule: instagram.com', '2026-03-21 20:47:51');

-- --------------------------------------------------------

--
-- Table structure for table `alerts`
--

CREATE TABLE `alerts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `activity_log_id` int(11) DEFAULT NULL,
  `alert_type` enum('blocked','malicious') NOT NULL,
  `message` varchar(255) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `alerts`
--

INSERT INTO `alerts` (`id`, `user_id`, `child_id`, `activity_log_id`, `alert_type`, `message`, `is_read`, `created_at`) VALUES
(1, 1, 1, 1, 'blocked', 'Ahmed attempted to access instagram.com', 1, '2026-01-09 21:09:25'),
(2, 1, 1, 7, 'blocked', 'Ahmed attempted to access instagram.com', 1, '2026-01-09 21:11:00'),
(3, 1, 1, 14, 'blocked', 'Ahmed attempted to access instagram.com', 0, '2026-01-09 23:42:29'),
(4, 1, 1, 20, 'blocked', 'Ahmed attempted to access www.youtube.com', 0, '2026-01-09 23:44:12'),
(5, 1, 1, 21, 'blocked', 'Ahmed attempted to access www.youtube.com', 0, '2026-01-09 23:44:31'),
(6, 1, 1, 23, 'blocked', 'Ahmed attempted to access www.youtube.com', 0, '2026-01-09 23:44:48'),
(7, 1, 1, 24, 'blocked', 'Ahmed attempted to access www.youtube.com', 0, '2026-01-09 23:44:48'),
(8, 1, 1, 25, 'blocked', 'Ahmed attempted to access www.youtube.com', 0, '2026-01-09 23:44:48'),
(9, 1, 1, 33, 'blocked', 'Malak attempted to access www.instagram.com', 0, '2026-03-21 20:47:51'),
(10, 1, 1, 34, 'blocked', 'Malak attempted to access www.instagram.com', 0, '2026-03-21 20:47:51'),
(11, 1, 1, 35, 'blocked', 'Malak attempted to access www.instagram.com', 0, '2026-03-21 20:47:51');

-- --------------------------------------------------------

--
-- Table structure for table `block_rules`
--

CREATE TABLE `block_rules` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `pattern` varchar(255) NOT NULL,
  `rule_type` enum('domain','keyword','regex') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `block_rules`
--

INSERT INTO `block_rules` (`id`, `user_id`, `category_id`, `pattern`, `rule_type`, `is_active`, `created_at`) VALUES
(1, 1, NULL, 'instagram.com', 'domain', 1, '2026-01-09 20:38:35'),
(2, 1, NULL, 'youtube.com', 'domain', 1, '2026-01-09 23:44:02');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `default_blocked` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `default_blocked`) VALUES
(1, 'Adult Content', 'Explicit or sexual content', 1),
(2, 'Gambling', 'Betting and gambling sites', 1),
(3, 'Violence', 'Graphic violence or gore', 1),
(4, 'Social Media', 'Social networks and chats', 0),
(5, 'Downloads', 'File sharing and downloads', 0),
(6, 'Games', 'Online games', 0);

-- --------------------------------------------------------

--
-- Table structure for table `children`
--

CREATE TABLE `children` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `birth_year` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `children`
--

INSERT INTO `children` (`id`, `user_id`, `name`, `birth_year`, `created_at`) VALUES
(1, 1, 'Malak', 2016, '2026-01-09 20:28:56'),
(2, 2, 'Sara', 2015, '2026-03-21 18:11:32'),
(3, 3, 'Layan', 2017, '2026-03-21 18:11:32'),
(4, 4, 'Fahad', 2016, '2026-03-21 18:11:32'),
(5, 5, 'Yousef', 2014, '2026-03-21 18:11:32'),
(6, 6, 'Reem', 2018, '2026-03-21 18:11:32');

-- --------------------------------------------------------

--
-- Table structure for table `child_category_settings`
--

CREATE TABLE `child_category_settings` (
  `child_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `is_blocked` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `child_category_settings`
--

INSERT INTO `child_category_settings` (`child_id`, `category_id`, `is_blocked`) VALUES
(1, 1, 1),
(1, 2, 1),
(1, 3, 1),
(1, 4, 0),
(1, 5, 1),
(1, 6, 0);

-- --------------------------------------------------------

--
-- Table structure for table `devices`
--

CREATE TABLE `devices` (
  `id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `device_name` varchar(120) NOT NULL,
  `api_token` varchar(64) NOT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `devices`
--

INSERT INTO `devices` (`id`, `child_id`, `device_name`, `api_token`, `last_seen_at`, `created_at`) VALUES
(1, 1, 'lenovo devices', '33ffd0a4c771b18b7326961bb1f193c7350729aa987ce99c', '2026-03-21 20:51:59', '2026-01-09 20:32:48');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `alert_email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `alert_email`, `created_at`, `updated_at`) VALUES
(1, 'Amani@gmail.com', '$2a$10$DXaYf6ot/Q/Y1aKmwRCQYOm5ZSRg1q73hFaRdTtrUqIRkdLXEI.Ia', 'Amani Laghabi ', 'Amani@gmail.com', '2026-01-09 20:28:31', '2026-01-09 20:28:31'),
(2, 'badria202306642@gmail.com', '$2a$10$DXaYf6ot/Q/Ybc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2yXEI.Ia', 'Badria Yahya Laghabi', 'badria202306642@gmail.com', '2026-03-21 18:03:22', '2026-03-21 18:03:22'),
(3, 'riman202306643@gmail.com', '$2a$10$DXaYf6ot/Q/Ybc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2yXEI.Ia', 'Riman Riyad Houbani', 'riman202306643@gmail.com', '2026-03-21 18:03:22', '2026-03-21 18:03:22'),
(4, 'maha202305105@gmail.com', '$2a$10$DXaYf6ot/Q/Ybc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2yXEI.Ia', 'Maha Jaber', 'maha202305105@gmail.com', '2026-03-21 18:03:22', '2026-03-21 18:03:22'),
(5, 'hayam202304755@gmail.com', '$2a$10$DXaYf6ot/Q/Ybc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2yXEI.Ia', 'Hayam Hassan', 'hayam202304755@gmail.com', '2026-03-21 18:03:22', '2026-03-21 18:03:22'),
(6, 'norah202307087@gmail.com', '$2a$10$DXaYf6ot/Q/Ybc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2yXEI.Ia', 'Norah Jaber Mahzari', 'norah202307087@gmail.com', '2026-03-21 18:03:22', '2026-03-21 18:03:22');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `child_id` (`child_id`),
  ADD KEY `device_id` (`device_id`);

--
-- Indexes for table `alerts`
--
ALTER TABLE `alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `child_id` (`child_id`),
  ADD KEY `activity_log_id` (`activity_log_id`);

--
-- Indexes for table `block_rules`
--
ALTER TABLE `block_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `children`
--
ALTER TABLE `children`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `child_category_settings`
--
ALTER TABLE `child_category_settings`
  ADD PRIMARY KEY (`child_id`,`category_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `devices`
--
ALTER TABLE `devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_token` (`api_token`),
  ADD KEY `child_id` (`child_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `alerts`
--
ALTER TABLE `alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `block_rules`
--
ALTER TABLE `block_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `children`
--
ALTER TABLE `children`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `devices`
--
ALTER TABLE `devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `activity_logs_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `alerts`
--
ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `alerts_ibfk_3` FOREIGN KEY (`activity_log_id`) REFERENCES `activity_logs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `block_rules`
--
ALTER TABLE `block_rules`
  ADD CONSTRAINT `block_rules_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `block_rules_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `children`
--
ALTER TABLE `children`
  ADD CONSTRAINT `children_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `child_category_settings`
--
ALTER TABLE `child_category_settings`
  ADD CONSTRAINT `child_category_settings_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `child_category_settings_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `devices`
--
ALTER TABLE `devices`
  ADD CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
