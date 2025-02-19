-- --------------------------------------------------------
-- Hôte:                         127.0.0.1
-- Version du serveur:           8.0.30 - MySQL Community Server - GPL
-- SE du serveur:                Win64
-- HeidiSQL Version:             12.1.0.6537
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Listage de la structure de la base pour chicken_roam
CREATE DATABASE IF NOT EXISTS `chicken_roam` /*!40100 DEFAULT CHARACTER SET utf8mb3 */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `chicken_roam`;

-- Listage de la structure de table chicken_roam. adonis_schema
CREATE TABLE IF NOT EXISTS `adonis_schema` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  `migration_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.adonis_schema : ~1 rows (environ)
INSERT INTO `adonis_schema` (`id`, `name`, `batch`, `migration_time`) VALUES
	(1, 'database/migrations/1738932588006_create_users_table', 1, '2025-02-18 10:54:28'),
	(2, 'database/migrations/1738932679131_create_plans_table', 1, '2025-02-18 10:54:28'),
	(3, 'database/migrations/1738932939720_create_histories_table', 1, '2025-02-18 10:54:28'),
	(4, 'database/migrations/1738933000927_create_vertices_table', 1, '2025-02-18 10:54:28'),
	(5, 'database/migrations/1738933000930_create_elements_table', 1, '2025-02-18 10:54:28'),
	(6, 'database/migrations/1738933033671_create_objectives_table', 1, '2025-02-18 10:54:28'),
	(7, 'database/migrations/1738933204021_create_fences_table', 1, '2025-02-18 10:54:28'),
	(8, 'database/migrations/1738933268103_create_plan_objectives_table', 1, '2025-02-18 10:54:29'),
	(9, 'database/migrations/1738933290987_create_element_vertices_table', 1, '2025-02-18 10:54:29'),
	(10, 'database/migrations/1739260095000_create_tokens_table', 1, '2025-02-18 10:54:29'),
	(11, 'database/migrations/1739345969707_create_remember_me_tokens_table', 1, '2025-02-18 10:54:29');

-- Listage de la structure de table chicken_roam. adonis_schema_versions
CREATE TABLE IF NOT EXISTS `adonis_schema_versions` (
  `version` int unsigned NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.adonis_schema_versions : ~0 rows (environ)
INSERT INTO `adonis_schema_versions` (`version`) VALUES
	(2);

-- Listage de la structure de table chicken_roam. elements
CREATE TABLE IF NOT EXISTS `elements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `objective_value` int NOT NULL,
  `width` int NOT NULL,
  `height` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `plan_id` int unsigned DEFAULT NULL,
  `vertex_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `elements_plan_id_foreign` (`plan_id`),
  KEY `elements_vertex_id_foreign` (`vertex_id`),
  CONSTRAINT `elements_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `elements_vertex_id_foreign` FOREIGN KEY (`vertex_id`) REFERENCES `vertices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.elements : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. element_vertices
CREATE TABLE IF NOT EXISTS `element_vertices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `element_id` int unsigned DEFAULT NULL,
  `vertex_id` int unsigned DEFAULT NULL,
  `vertex_order` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `element_vertices_element_id_foreign` (`element_id`),
  KEY `element_vertices_vertex_id_foreign` (`vertex_id`),
  CONSTRAINT `element_vertices_element_id_foreign` FOREIGN KEY (`element_id`) REFERENCES `elements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `element_vertices_vertex_id_foreign` FOREIGN KEY (`vertex_id`) REFERENCES `vertices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.element_vertices : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. fences
CREATE TABLE IF NOT EXISTS `fences` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `vertex_end_id` int unsigned DEFAULT NULL,
  `vertex_start_id` int unsigned DEFAULT NULL,
  `plan_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fences_vertex_end_id_foreign` (`vertex_end_id`),
  KEY `fences_vertex_start_id_foreign` (`vertex_start_id`),
  KEY `fences_plan_id_foreign` (`plan_id`),
  CONSTRAINT `fences_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fences_vertex_end_id_foreign` FOREIGN KEY (`vertex_end_id`) REFERENCES `vertices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fences_vertex_start_id_foreign` FOREIGN KEY (`vertex_start_id`) REFERENCES `vertices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.fences : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. histories
CREATE TABLE IF NOT EXISTS `histories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `version_name` varchar(50) NOT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `plan_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `histories_user_id_foreign` (`user_id`),
  KEY `histories_plan_id_foreign` (`plan_id`),
  CONSTRAINT `histories_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `histories_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.histories : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. objectives
CREATE TABLE IF NOT EXISTS `objectives` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `goal` int NOT NULL,
  `unit` varchar(20) NOT NULL,
  `per_nb_chicken` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.objectives : ~7 rows (environ)
INSERT INTO `objectives` (`id`, `name`, `description`, `goal`, `unit`, `per_nb_chicken`) VALUES
	(1, 'area', 'Total area needed per chicken', 15, 'm²', 1),
	(2, 'perch', 'Perch length needed per chicken', 20, 'cm', 1),
	(3, 'shelter', 'Shelter area needed for 10 chickens', 3, 'm²', 10),
	(4, 'shrubs', 'Edible shrubs needed for 10 chickens', 3, 'shrubs', 10),
	(5, 'insectary', 'Insect-hosting structures needed for 5 chickens', 1, 'structure', 5),
	(6, 'dustbath', 'Dust bath area needed for 10 chickens', 3, 'm²', 10),
	(7, 'waterer', 'Water points needed for 5 chickens', 1, 'water point', 5);

-- Listage de la structure de table chicken_roam. plans
CREATE TABLE IF NOT EXISTS `plans` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `nb_chickens` int NOT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT '0',
  `is_temporary` tinyint(1) DEFAULT '0',
  `is_enclosed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `plans_user_id_foreign` (`user_id`),
  CONSTRAINT `plans_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.plans : ~2 rows (environ)
INSERT INTO `plans` (`id`, `name`, `nb_chickens`, `user_id`, `is_completed`, `is_temporary`, `is_enclosed`, `created_at`, `updated_at`) VALUES
	(23, 'Plan 2025-02-19 09:02', 10, 1, 0, 0, 0, '2025-02-19 08:02:56', '2025-02-19 08:02:56'),
	(32, 'Guest Plan 2025-02-19 09:15', 10, NULL, 0, 1, 0, '2025-02-19 08:15:08', '2025-02-19 08:15:08');

-- Listage de la structure de table chicken_roam. plan_objectives
CREATE TABLE IF NOT EXISTS `plan_objectives` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` int unsigned DEFAULT NULL,
  `objective_id` int unsigned DEFAULT NULL,
  `completion_percentage` int NOT NULL DEFAULT '0',
  `target_value` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plan_objectives_plan_id_foreign` (`plan_id`),
  KEY `plan_objectives_objective_id_foreign` (`objective_id`),
  CONSTRAINT `plan_objectives_objective_id_foreign` FOREIGN KEY (`objective_id`) REFERENCES `objectives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `plan_objectives_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=169 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.plan_objectives : ~63 rows (environ)
INSERT INTO `plan_objectives` (`id`, `plan_id`, `objective_id`, `completion_percentage`, `target_value`) VALUES
	(99, 23, 1, 0, 150),
	(100, 23, 2, 0, 200),
	(101, 23, 3, 0, 3),
	(102, 23, 4, 0, 3),
	(103, 23, 5, 0, 2),
	(104, 23, 6, 0, 3),
	(105, 23, 7, 0, 2),
	(162, 32, 1, 0, 150),
	(163, 32, 2, 0, 200),
	(164, 32, 3, 0, 3),
	(165, 32, 4, 0, 3),
	(166, 32, 5, 0, 2),
	(167, 32, 6, 0, 3),
	(168, 32, 7, 0, 2);

-- Listage de la structure de table chicken_roam. remember_me_tokens
CREATE TABLE IF NOT EXISTS `remember_me_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_id` int unsigned NOT NULL,
  `hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  `expires_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `remember_me_tokens_hash_unique` (`hash`),
  KEY `remember_me_tokens_tokenable_id_foreign` (`tokenable_id`),
  CONSTRAINT `remember_me_tokens_tokenable_id_foreign` FOREIGN KEY (`tokenable_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.remember_me_tokens : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. tokens
CREATE TABLE IF NOT EXISTS `tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tokens_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.tokens : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `email` varchar(254) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.users : ~0 rows (environ)
INSERT INTO `users` (`id`, `username`, `email`, `password`, `created_at`, `updated_at`) VALUES
	(1, 'test1', 'test1@test.fr', '$scrypt$n=16384,r=8,p=1$mCEHAkHxOHpqBqGJiG2fuw$rFvaXfmkPmlJUtqDoHCzh+8p2aRE1N4L0IVpEnvkpKsRAcBTZlBooOqh8WX15GGoCpfbqjQ5c6MIMwn+zjmWRA', '2025-02-18 09:55:11', '2025-02-18 09:55:11');

-- Listage de la structure de table chicken_roam. vertices
CREATE TABLE IF NOT EXISTS `vertices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `position_x` decimal(6,2) DEFAULT NULL,
  `position_y` decimal(6,2) DEFAULT NULL,
  `plan_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vertices_plan_id_foreign` (`plan_id`),
  CONSTRAINT `vertices_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb3;

-- Listage des données de la table chicken_roam.vertices : ~0 rows (environ)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
