-- MULCV GeoArchives - comptes utilisateurs MySQL
-- A executer UNE SEULE FOIS sur une base qui contient deja le schema GeoArchives.
-- L'application ne cree pas cette table au demarrage.

CREATE TABLE IF NOT EXISTS geoarchive_users (
  id CHAR(36) PRIMARY KEY,
  login VARCHAR(190) NOT NULL,
  email VARCHAR(190) NULL,
  full_name VARCHAR(190) NOT NULL,
  role ENUM('admin', 'executive', 'agent') NOT NULL DEFAULT 'agent',
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_by VARCHAR(190) NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY geoarchive_users_login_unique (login),
  KEY geoarchive_users_role_status_idx (role, status),
  KEY geoarchive_users_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
