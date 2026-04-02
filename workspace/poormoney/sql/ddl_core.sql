-- 지갑지키미 (코드 기준 최소 코어 스키마)
-- 실행 순서: 이 파일 전체 실행 → (필요 시) seed 데이터 삽입

CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  login_id VARCHAR(50) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  level_title VARCHAR(50) NOT NULL,
  role VARCHAR(10) NOT NULL,
  banned TINYINT(1) NOT NULL DEFAULT 0,
  ban_reason VARCHAR(200) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_login_id (login_id)
);

CREATE TABLE IF NOT EXISTS restaurants (
  id BIGINT NOT NULL AUTO_INCREMENT,
  approved_id VARCHAR(80) NOT NULL,
  name VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  address VARCHAR(200) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  menu_name VARCHAR(80) NOT NULL DEFAULT '',
  menu_price_label VARCHAR(80) NOT NULL DEFAULT '',
  menu_prices_json LONGTEXT NULL,
  recommend_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_restaurants_approved_id (approved_id),
  UNIQUE KEY uk_restaurants_name (name)
);

CREATE TABLE IF NOT EXISTS restaurant_photos (
  id BIGINT NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT NOT NULL,
  url LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_restaurant_photos_restaurant_id (restaurant_id),
  CONSTRAINT fk_restaurant_photos_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS map_comments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  restaurant_name VARCHAR(80) NOT NULL,
  user_id BIGINT NULL,
  nickname VARCHAR(50) NOT NULL,
  level_title VARCHAR(50) NOT NULL,
  rating INT NULL,
  text VARCHAR(1000) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_map_comments_restaurant_name (restaurant_name),
  KEY idx_map_comments_user_id (user_id),
  CONSTRAINT fk_map_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS map_comment_photos (
  id BIGINT NOT NULL AUTO_INCREMENT,
  map_comment_id BIGINT NOT NULL,
  url LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_map_comment_photos_comment_id (map_comment_id),
  CONSTRAINT fk_map_comment_photos_comment
    FOREIGN KEY (map_comment_id) REFERENCES map_comments(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  restaurant_name VARCHAR(80) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bookmarks_user_restaurant (user_id, restaurant_name),
  KEY idx_bookmarks_user_id (user_id),
  CONSTRAINT fk_bookmarks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS restaurant_submissions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  decided_at DATETIME(6) NULL,
  restaurant_name VARCHAR(80) NOT NULL,
  restaurant_address VARCHAR(200) NOT NULL,
  category_label VARCHAR(40) NOT NULL,
  menu_name VARCHAR(80) NOT NULL,
  menu_price VARCHAR(80) NOT NULL,
  rating INT NULL,
  photos_json LONGTEXT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS comment_reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  comment_id VARCHAR(50) NOT NULL,
  reason VARCHAR(200) NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS bug_reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  status VARCHAR(20) NOT NULL,
  payload_json LONGTEXT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS unban_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  login_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY idx_unban_requests_login_id (login_id)
);

CREATE TABLE IF NOT EXISTS site_notice (
  id BIGINT NOT NULL AUTO_INCREMENT,
  body VARCHAR(2000) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS activity_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(30) NOT NULL,
  payload_json LONGTEXT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_activity_events_user_id (user_id),
  CONSTRAINT fk_activity_events_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

