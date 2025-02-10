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
CREATE DATABASE IF NOT EXISTS `chicken_roam` /*!40100 DEFAULT CHARACTER SET latin1 */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `chicken_roam`;

-- Listage de la structure de table chicken_roam. adonis_schema
CREATE TABLE IF NOT EXISTS `adonis_schema` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  `migration_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.adonis_schema : ~0 rows (environ)
INSERT INTO `adonis_schema` (`id`, `name`, `batch`, `migration_time`) VALUES
	(10, 'database/migrations/1738932588006_create_users_table', 1, '2025-02-10 07:47:18'),
	(11, 'database/migrations/1738932679131_create_plans_table', 1, '2025-02-10 07:47:18'),
	(12, 'database/migrations/1738932939720_create_histories_table', 1, '2025-02-10 07:47:18'),
	(13, 'database/migrations/1738932989830_create_elements_table', 1, '2025-02-10 07:47:19'),
	(14, 'database/migrations/1738933000927_create_vertices_table', 1, '2025-02-10 07:47:19'),
	(15, 'database/migrations/1738933033671_create_objectives_table', 1, '2025-02-10 07:47:19'),
	(16, 'database/migrations/1738933204021_create_fences_table', 1, '2025-02-10 07:47:19'),
	(17, 'database/migrations/1738933268103_create_create_plan_objectives_table', 1, '2025-02-10 07:47:19'),
	(18, 'database/migrations/1738933290987_create_create_element_vertices_table', 1, '2025-02-10 07:47:19');

-- Listage de la structure de table chicken_roam. adonis_schema_versions
CREATE TABLE IF NOT EXISTS `adonis_schema_versions` (
  `version` int unsigned NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.adonis_schema_versions : ~0 rows (environ)
INSERT INTO `adonis_schema_versions` (`version`) VALUES
	(2);

-- Listage de la structure de table chicken_roam. elements
CREATE TABLE IF NOT EXISTS `elements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `objectiveValue` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `planId` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `elements_planid_foreign` (`planId`),
  CONSTRAINT `elements_planid_foreign` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.elements : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. element_vertices
CREATE TABLE IF NOT EXISTS `element_vertices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `elementId` int unsigned DEFAULT NULL,
  `vertexId` int unsigned DEFAULT NULL,
  `vertexOrder` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `create_element_vertices_elementid_foreign` (`elementId`),
  KEY `create_element_vertices_vertexid_foreign` (`vertexId`),
  CONSTRAINT `create_element_vertices_elementid_foreign` FOREIGN KEY (`elementId`) REFERENCES `elements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `create_element_vertices_vertexid_foreign` FOREIGN KEY (`vertexId`) REFERENCES `vertices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.element_vertices : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. fences
CREATE TABLE IF NOT EXISTS `fences` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `vertexEndId` int unsigned DEFAULT NULL,
  `vertexStartId` int unsigned DEFAULT NULL,
  `planId` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fences_vertexendid_foreign` (`vertexEndId`),
  KEY `fences_vertexstartid_foreign` (`vertexStartId`),
  KEY `fences_planid_foreign` (`planId`),
  CONSTRAINT `fences_planid_foreign` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fences_vertexendid_foreign` FOREIGN KEY (`vertexEndId`) REFERENCES `vertices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fences_vertexstartid_foreign` FOREIGN KEY (`vertexStartId`) REFERENCES `vertices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.fences : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. histories
CREATE TABLE IF NOT EXISTS `histories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `version_name` varchar(50) NOT NULL,
  `userId` int unsigned DEFAULT NULL,
  `planId` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `histories_userid_foreign` (`userId`),
  KEY `histories_planid_foreign` (`planId`),
  CONSTRAINT `histories_planid_foreign` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `histories_userid_foreign` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.histories : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. objectives
CREATE TABLE IF NOT EXISTS `objectives` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `goal` int NOT NULL,
  `unit` varchar(20) NOT NULL,
  `perNbChicken` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.objectives : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. plans
CREATE TABLE IF NOT EXISTS `plans` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `nbChickens` int NOT NULL,
  `isCompleted` tinyint(1) DEFAULT '0',
  `userId` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `plans_userid_foreign` (`userId`),
  CONSTRAINT `plans_userid_foreign` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.plans : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. plan_objectives
CREATE TABLE IF NOT EXISTS `plan_objectives` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `planId` int unsigned DEFAULT NULL,
  `objectiveId` int unsigned DEFAULT NULL,
  `completionPercentage` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `create_plan_objectives_planid_foreign` (`planId`),
  KEY `create_plan_objectives_objectiveid_foreign` (`objectiveId`),
  CONSTRAINT `create_plan_objectives_objectiveid_foreign` FOREIGN KEY (`objectiveId`) REFERENCES `objectives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `create_plan_objectives_planid_foreign` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.plan_objectives : ~0 rows (environ)

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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.users : ~0 rows (environ)

-- Listage de la structure de table chicken_roam. vertices
CREATE TABLE IF NOT EXISTS `vertices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `positionX` decimal(6,2) DEFAULT NULL,
  `positionY` decimal(6,2) DEFAULT NULL,
  `planId` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vertices_planid_foreign` (`planId`),
  CONSTRAINT `vertices_planid_foreign` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Listage des données de la table chicken_roam.vertices : ~0 rows (environ)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
