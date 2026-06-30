-- ExamPulse ML enhancement support tables/columns.
-- Run after 20260428_online_exam_platform_upgrade.sql.

USE `onlineexam`;

DROP PROCEDURE IF EXISTS onlineexam_add_column_if_missing;
DROP PROCEDURE IF EXISTS onlineexam_add_index_if_missing;

DELIMITER $$

CREATE PROCEDURE onlineexam_add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE onlineexam_add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_index_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ', p_index_ddl);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

CALL onlineexam_add_column_if_missing('questions_answers', 'ml_quality_score', 'DECIMAL(5,2) NULL AFTER `answer_image`');
CALL onlineexam_add_column_if_missing('questions_answers', 'ml_metadata_json', 'JSON NULL AFTER `ml_quality_score`');
CALL onlineexam_add_column_if_missing('questions_answers', 'embedding_json', 'JSON NULL AFTER `ml_metadata_json`');

CALL onlineexam_add_column_if_missing('exam_attempt_answers', 'time_taken_seconds', 'INT NULL AFTER `marks_awarded`');
CALL onlineexam_add_column_if_missing('exam_attempt_answers', 'answered_at', 'DATETIME NULL AFTER `time_taken_seconds`');

CALL onlineexam_add_column_if_missing('exam_attempts', 'ml_risk_score', 'DECIMAL(5,2) NULL AFTER `percentage`');
CALL onlineexam_add_column_if_missing('exam_attempts', 'ml_risk_level', 'ENUM(''Low'',''Medium'',''High'') NULL AFTER `ml_risk_score`');
CALL onlineexam_add_column_if_missing('exam_attempts', 'ml_analysis_json', 'JSON NULL AFTER `ml_risk_level`');

CREATE TABLE IF NOT EXISTS `ml_prediction_logs` (
  `prediction_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `feature_name` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(80) NULL,
  `entity_id` VARCHAR(80) NULL,
  `requested_by` INT NULL,
  `input_json` JSON NULL,
  `output_json` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`prediction_id`),
  KEY `idx_ml_prediction_feature` (`feature_name`, `created_at`),
  KEY `idx_ml_prediction_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CALL onlineexam_add_index_if_missing('questions_answers', 'idx_qa_ml_quality', 'ADD INDEX `idx_qa_ml_quality` (`ml_quality_score`)');
CALL onlineexam_add_index_if_missing('exam_attempts', 'idx_attempts_ml_risk', 'ADD INDEX `idx_attempts_ml_risk` (`ml_risk_level`, `ml_risk_score`)');

DROP PROCEDURE IF EXISTS onlineexam_add_column_if_missing;
DROP PROCEDURE IF EXISTS onlineexam_add_index_if_missing;
