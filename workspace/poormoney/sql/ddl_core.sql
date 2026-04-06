SET NAMES utf8mb4;
SET time_zone = '+09:00';

CREATE DATABASE IF NOT EXISTS `test`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `login_id` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50) NOT NULL,
  `bio` VARCHAR(500) NOT NULL DEFAULT '',
  `profile_image_url` VARCHAR(1000) NOT NULL DEFAULT '',
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
  `banned` TINYINT(1) NOT NULL DEFAULT 0,
  `ban_reason` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_login_id` (`login_id`),
  UNIQUE KEY `uk_users_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `badges` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(100) NOT NULL DEFAULT '',
  `level` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_badges_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_badges` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `badge_id` BIGINT NOT NULL,
  `granted_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reason` VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_badges_user_badge` (`user_id`, `badge_id`),
  CONSTRAINT `fk_user_badges_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_badges_badge`
    FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `restaurants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT '기타',
  `address` VARCHAR(300) NOT NULL DEFAULT '',
  `phone` VARCHAR(50) NOT NULL DEFAULT '',
  `base_rating` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  `menu_name` VARCHAR(120) NOT NULL DEFAULT '',
  `menu_price_label` VARCHAR(50) NOT NULL DEFAULT '',
  `menu_prices_json` LONGTEXT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_restaurants_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `restaurant_photos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `restaurant_id` BIGINT NOT NULL,
  `photo_url` VARCHAR(1200) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_restaurant_photos_restaurant` (`restaurant_id`, `sort_order`),
  CONSTRAINT `fk_restaurant_photos_restaurant`
    FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `restaurant_hidden_photos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `restaurant_id` BIGINT NOT NULL,
  `photo_url` VARCHAR(1200) NOT NULL,
  `admin_user_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_restaurant_hidden_photos` (`restaurant_id`, `photo_url`),
  KEY `idx_restaurant_hidden_photos_restaurant` (`restaurant_id`),
  CONSTRAINT `fk_restaurant_hidden_photos_restaurant`
    FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_hidden_photos_admin_user`
    FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `map_comments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `restaurant_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `rating` INT NOT NULL,
  `text` VARCHAR(2000) NOT NULL DEFAULT '',
  `nickname_snapshot` VARCHAR(50) NOT NULL,
  `level_title_snapshot` VARCHAR(50) NOT NULL DEFAULT '',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_map_comments_restaurant_created` (`restaurant_id`, `created_at`),
  KEY `idx_map_comments_user_created` (`user_id`, `created_at`),
  CONSTRAINT `ck_map_comments_rating` CHECK (`rating` >= 1 AND `rating` <= 5),
  CONSTRAINT `fk_map_comments_restaurant`
    FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_map_comments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `map_comment_photos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `comment_id` BIGINT NOT NULL,
  `photo_url` VARCHAR(1200) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_map_comment_photos_comment` (`comment_id`, `sort_order`),
  CONSTRAINT `fk_map_comment_photos_comment`
    FOREIGN KEY (`comment_id`) REFERENCES `map_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bookmarks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `restaurant_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bookmarks_user_restaurant` (`user_id`, `restaurant_id`),
  KEY `idx_bookmarks_user` (`user_id`),
  CONSTRAINT `fk_bookmarks_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookmarks_restaurant`
    FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `restaurant_submissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submitter_user_id` BIGINT NOT NULL,
  `restaurant_name` VARCHAR(120) NOT NULL,
  `restaurant_address` VARCHAR(300) NOT NULL DEFAULT '',
  `category_label` VARCHAR(50) NOT NULL DEFAULT '',
  `menu_name` VARCHAR(120) NOT NULL DEFAULT '',
  `menu_price_text` VARCHAR(50) NOT NULL DEFAULT '',
  `rating` INT NOT NULL,
  `photos_json` LONGTEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `decided_at` DATETIME(6) NULL,
  `approved_restaurant_id` BIGINT NULL,
  `decided_by_admin_user_id` BIGINT NULL,
  `admin_memo` VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_restaurant_submissions_status_created` (`status`, `created_at`),
  CONSTRAINT `ck_restaurant_submissions_rating` CHECK (`rating` >= 1 AND `rating` <= 5),
  CONSTRAINT `fk_restaurant_submissions_submitter`
    FOREIGN KEY (`submitter_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_submissions_approved_restaurant`
    FOREIGN KEY (`approved_restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_restaurant_submissions_admin_user`
    FOREIGN KEY (`decided_by_admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `comment_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `reporter_user_id` BIGINT NOT NULL,
  `comment_id` BIGINT NOT NULL,
  `reason` VARCHAR(500) NOT NULL DEFAULT '',
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `decided_at` DATETIME(6) NULL,
  `decided_by_admin_user_id` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comment_reports_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_comment_reports_reporter`
    FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_reports_comment`
    FOREIGN KEY (`comment_id`) REFERENCES `map_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_reports_admin_user`
    FOREIGN KEY (`decided_by_admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bug_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `reporter_user_id` BIGINT NOT NULL,
  `restaurant_name_snapshot` VARCHAR(120) NOT NULL DEFAULT '',
  `restaurant_address_snapshot` VARCHAR(300) NOT NULL DEFAULT '',
  `body` VARCHAR(2000) NOT NULL DEFAULT '',
  `photos_json` LONGTEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `decided_at` DATETIME(6) NULL,
  `decided_by_admin_user_id` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bug_reports_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_bug_reports_reporter`
    FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bug_reports_admin_user`
    FOREIGN KEY (`decided_by_admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `unban_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING / APPROVED / REJECTED
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `decided_at` DATETIME(6) NULL,
  `decided_by_admin_user_id` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_unban_requests_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_unban_requests_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_unban_requests_admin_user`
    FOREIGN KEY (`decided_by_admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `site_notice` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `body` VARCHAR(2000) NOT NULL DEFAULT '',
  `active` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by_admin_user_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_site_notice_admin_user`
    FOREIGN KEY (`updated_by_admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `activity_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `type` VARCHAR(30) NOT NULL DEFAULT 'other',
  `payload_json` LONGTEXT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_activity_events_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_activity_events_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;




INSERT INTO users (login_id, password_hash, nickname, bio, profile_image_url, role, banned, ban_reason)
VALUES ('poormoney', 'yooned1357@', '관리자', '', '', 'ADMIN', 0, '');


USE test;

UPDATE users
SET password_hash = '$2a$10$41IExjrQVzWf8BjvKznIv.Hv0EmykHH3eZBEytU46Eik5s/ThOCdm',
    role = 'ADMIN',
    banned = 0,
    ban_reason = ''
WHERE login_id = 'poormoney';

SELECT id, login_id, role, banned, password_hash
FROM users
WHERE login_id = 'poormoney';