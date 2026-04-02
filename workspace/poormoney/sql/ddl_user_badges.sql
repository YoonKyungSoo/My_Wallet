-- user_badges (JPA validate 사용 시 테이블이 없으면 앱 기동 전 1회 실행)
CREATE TABLE IF NOT EXISTS user_badges (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  badge_id BIGINT NOT NULL,
  granted_at DATETIME(6) NOT NULL,
  UNIQUE KEY uk_user_badge (user_id, badge_id),
  CONSTRAINT fk_ub_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_ub_badge FOREIGN KEY (badge_id) REFERENCES badges (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
