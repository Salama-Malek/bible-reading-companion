-- Patch: add notifications_log table for cron notification runs.

CREATE TABLE IF NOT EXISTS notifications_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_date DATE NOT NULL,
  sent_count INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSON NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_log_run_date (run_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
