CREATE DATABASE IF NOT EXISTS qiangchewei DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qiangchewei;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expired_at DATETIME NOT NULL,
  refresh_expired_at DATETIME NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_sessions_user_id (user_id),
  INDEX idx_user_sessions_revoked (revoked),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS player_profiles (
  user_id BIGINT PRIMARY KEY,
  nickname VARCHAR(30) NOT NULL,
  game_data JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS friendships (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  friend_user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_friendships_pair (user_id, friend_user_id),
  INDEX idx_friendships_user_id (user_id),
  INDEX idx_friendships_friend_user_id (friend_user_id),
  CONSTRAINT fk_friendships_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_friendships_friend_user FOREIGN KEY (friend_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS friend_parking (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  friend_user_id BIGINT NOT NULL,
  owner_user_id BIGINT NOT NULL,
  car_uid VARCHAR(128) NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_friend_parking_owner_car (owner_user_id, car_uid),
  INDEX idx_friend_parking_friend_user (friend_user_id),
  INDEX idx_friend_parking_owner_user (owner_user_id),
  CONSTRAINT fk_friend_parking_friend_user FOREIGN KEY (friend_user_id) REFERENCES users(id),
  CONSTRAINT fk_friend_parking_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS operation_audit (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  action VARCHAR(64) NOT NULL,
  req_payload JSON NULL,
  resp_code INT NOT NULL,
  resp_msg VARCHAR(255) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  risk_flag TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_operation_audit_user_id (user_id),
  INDEX idx_operation_audit_action (action),
  INDEX idx_operation_audit_created_at (created_at)
) ENGINE=InnoDB;
