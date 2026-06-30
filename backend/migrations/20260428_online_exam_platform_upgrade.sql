-- ExamPulse online exam platform schema upgrade
-- Reviewed against: C:\Users\nssra\OneDrive\Documents\dumps\Dump20260324.sql
-- Purpose:
-- 1. Preserve the existing onlineexam schema and data.
-- 2. Fix compatibility gaps used by the current backend routes.
-- 3. Add normalized tables for secure exams, practice, worksheets, parents,
--    adaptive models, analytics, notifications, and audit logs.
--
-- Run on MySQL 8.0+ against the onlineexam database after taking a backup.

USE `onlineexam`;

SET FOREIGN_KEY_CHECKS = 0;

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
    SET @ddl = CONCAT(
      'ALTER TABLE `', REPLACE(p_table, '`', '``'),
      '` ADD COLUMN `', REPLACE(p_column, '`', '``'),
      '` ', p_definition
    );
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
    SET @ddl = CONCAT(
      'ALTER TABLE `', REPLACE(p_table, '`', '``'),
      '` ', p_index_ddl
    );
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 1. Compatibility fixes for the current Node/React code.
-- ---------------------------------------------------------------------------

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('superadmin','admin','teacher','student','parent') NOT NULL;

-- Do not add a generated `id` alias: MySQL does not allow generated columns
-- to reference an AUTO_INCREMENT column. Backend routes now use `user_id`.
CALL onlineexam_add_column_if_missing('users', 'status', 'ENUM(''active'',''inactive'',''pending'',''blocked'') NOT NULL DEFAULT ''active'' AFTER `is_active`');
CALL onlineexam_add_column_if_missing('users', 'phone', 'VARCHAR(32) NULL AFTER `email`');
CALL onlineexam_add_column_if_missing('users', 'whatsapp_number', 'VARCHAR(32) NULL AFTER `phone`');
CALL onlineexam_add_column_if_missing('users', 'section', 'VARCHAR(20) NULL AFTER `class`');
CALL onlineexam_add_column_if_missing('users', 'program_name', 'VARCHAR(120) NULL AFTER `section`');
CALL onlineexam_add_column_if_missing('users', 'institution_id', 'INT NULL AFTER `schoolname`');
CALL onlineexam_add_column_if_missing('users', 'board_id', 'INT NULL AFTER `institution_id`');
CALL onlineexam_add_column_if_missing('users', 'password_hash', 'VARCHAR(255) NULL AFTER `password`');
CALL onlineexam_add_column_if_missing('users', 'email_verified_at', 'DATETIME NULL AFTER `created_at`');
CALL onlineexam_add_column_if_missing('users', 'last_login_at', 'DATETIME NULL AFTER `email_verified_at`');
CALL onlineexam_add_column_if_missing('users', 'created_by', 'INT NULL AFTER `last_login_at`');
CALL onlineexam_add_column_if_missing('users', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_by`');

UPDATE `users`
SET `status` = CASE WHEN `is_active` = 1 THEN 'active' ELSE 'inactive' END
WHERE `status` IS NULL;

CALL onlineexam_add_column_if_missing('courses', 'name', 'VARCHAR(100) GENERATED ALWAYS AS (`course_name`) VIRTUAL');
CALL onlineexam_add_column_if_missing('courses', 'board_id', 'INT NULL AFTER `category_id`');
CALL onlineexam_add_column_if_missing('courses', 'course_code', 'VARCHAR(50) NULL AFTER `course_name`');
CALL onlineexam_add_column_if_missing('courses', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `course_duration`');
CALL onlineexam_add_column_if_missing('courses', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`');
CALL onlineexam_add_column_if_missing('courses', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');

CALL onlineexam_add_column_if_missing('subjects', 'name', 'VARCHAR(100) GENERATED ALWAYS AS (`subject_name`) VIRTUAL');
CALL onlineexam_add_column_if_missing('subjects', 'subject_code', 'VARCHAR(50) NULL AFTER `subject_name`');
CALL onlineexam_add_column_if_missing('subjects', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `created_at`');

CALL onlineexam_add_column_if_missing('exams', 'exam_code', 'VARCHAR(64) NULL AFTER `exam_id`');
CALL onlineexam_add_column_if_missing('exams', 'exam_model_id', 'INT NULL AFTER `course_id`');
CALL onlineexam_add_column_if_missing('exams', 'board_id', 'INT NULL AFTER `exam_model_id`');
CALL onlineexam_add_column_if_missing('exams', 'institution_id', 'INT NULL AFTER `board_id`');
CALL onlineexam_add_column_if_missing('exams', 'from_date', 'DATETIME NULL AFTER `exam_date`');
CALL onlineexam_add_column_if_missing('exams', 'to_date', 'DATETIME NULL AFTER `from_date`');
CALL onlineexam_add_column_if_missing('exams', 'package_id', 'INT NULL AFTER `package`');
CALL onlineexam_add_column_if_missing('exams', 'exam_mode', 'ENUM(''scheduled'',''practice'',''worksheet'',''mock'',''diagnostic'') NOT NULL DEFAULT ''scheduled'' AFTER `order`');
CALL onlineexam_add_column_if_missing('exams', 'delivery_mode', 'ENUM(''online'',''print'',''both'') NOT NULL DEFAULT ''online'' AFTER `exam_mode`');
CALL onlineexam_add_column_if_missing('exams', 'generation_mode', 'ENUM(''manual'',''auto'',''adaptive'') NOT NULL DEFAULT ''manual'' AFTER `delivery_mode`');
CALL onlineexam_add_column_if_missing('exams', 'difficulty_policy', 'JSON NULL AFTER `generation_mode`');
CALL onlineexam_add_column_if_missing('exams', 'randomize_questions', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `difficulty_policy`');
CALL onlineexam_add_column_if_missing('exams', 'randomize_options', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `randomize_questions`');
CALL onlineexam_add_column_if_missing('exams', 'allow_resume', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `randomize_options`');
CALL onlineexam_add_column_if_missing('exams', 'max_attempts', 'INT NOT NULL DEFAULT 1 AFTER `allow_resume`');
CALL onlineexam_add_column_if_missing('exams', 'auto_submit', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `max_attempts`');
CALL onlineexam_add_column_if_missing('exams', 'disable_copy_paste', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `auto_submit`');
CALL onlineexam_add_column_if_missing('exams', 'require_fullscreen', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `disable_copy_paste`');
CALL onlineexam_add_column_if_missing('exams', 'show_result_immediately', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `require_fullscreen`');
CALL onlineexam_add_column_if_missing('exams', 'result_visibility', 'ENUM(''hidden'',''score_only'',''full_feedback'') NOT NULL DEFAULT ''full_feedback'' AFTER `show_result_immediately`');
CALL onlineexam_add_column_if_missing('exams', 'show_rank', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `result_visibility`');
CALL onlineexam_add_column_if_missing('exams', 'show_grade', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `show_rank`');
CALL onlineexam_add_column_if_missing('exams', 'instructions', 'LONGTEXT NULL AFTER `show_grade`');
CALL onlineexam_add_column_if_missing('exams', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `instructions`');
CALL onlineexam_add_column_if_missing('exams', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
CALL onlineexam_add_column_if_missing('exams', 'deleted_at', 'DATETIME NULL AFTER `updated_at`');

UPDATE `exams`
SET `from_date` = COALESCE(`from_date`, `start_time`),
    `to_date` = COALESCE(`to_date`, `end_time`),
    `exam_code` = COALESCE(`exam_code`, CONCAT('EXAM-', `exam_id`)),
    `package_id` = COALESCE(`package_id`, `package`);

CALL onlineexam_add_column_if_missing('exam_question_mapping', 'subject_id', 'INT NULL AFTER `question_id`');
CALL onlineexam_add_column_if_missing('exam_question_mapping', 'question_type_id', 'INT NULL AFTER `subject_id`');
CALL onlineexam_add_column_if_missing('exam_question_mapping', 'level_id', 'INT NULL AFTER `question_type_id`');
CALL onlineexam_add_column_if_missing('exam_question_mapping', 'section_id', 'INT NULL AFTER `section`');
CALL onlineexam_add_column_if_missing('exam_question_mapping', 'is_mandatory', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `negative_marks`');
CALL onlineexam_add_column_if_missing('exam_question_mapping', 'question_snapshot', 'JSON NULL AFTER `is_mandatory`');

UPDATE `exam_question_mapping` eqm
JOIN `questions_answers` qa ON qa.`id` = eqm.`question_id`
SET eqm.`subject_id` = COALESCE(eqm.`subject_id`, qa.`subject_id`),
    eqm.`question_type_id` = COALESCE(eqm.`question_type_id`, qa.`question_type_id`),
    eqm.`level_id` = COALESCE(eqm.`level_id`, qa.`level_id`);

ALTER TABLE `student_exam_answers`
  MODIFY COLUMN `attempt_id` INT NULL;

CALL onlineexam_add_column_if_missing('student_exam_answers', 'exam_id', 'INT NULL AFTER `attempt_id`');
CALL onlineexam_add_column_if_missing('student_exam_answers', 'user_id', 'INT NULL AFTER `exam_id`');
CALL onlineexam_add_column_if_missing('student_exam_answers', 'student_answer', 'LONGTEXT NULL AFTER `selected_answer`');
CALL onlineexam_add_column_if_missing('student_exam_answers', 'marks_obtained', 'DECIMAL(10,2) NULL AFTER `marks_awarded`');
CALL onlineexam_add_column_if_missing('student_exam_answers', 'answer_json', 'JSON NULL AFTER `student_answer`');
CALL onlineexam_add_column_if_missing('student_exam_answers', 'review_status', 'ENUM(''auto_scored'',''pending_manual'',''manually_scored'') NULL AFTER `answer_json`');

UPDATE `student_exam_answers` sea
JOIN `student_exam_attempts` sea2 ON sea2.`attempt_id` = sea.`attempt_id`
SET sea.`exam_id` = COALESCE(sea.`exam_id`, sea2.`exam_id`),
    sea.`user_id` = COALESCE(sea.`user_id`, sea2.`student_id`);

UPDATE `student_exam_answers`
SET `student_answer` = COALESCE(`student_answer`, `selected_answer`),
    `marks_obtained` = COALESCE(`marks_obtained`, `marks_awarded`);

CALL onlineexam_add_column_if_missing('student_exam_results', 'submission_id', 'INT NULL AFTER `id`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'attempt_id', 'BIGINT UNSIGNED NULL AFTER `submission_id`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'total_questions', 'INT NULL AFTER `total_marks`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'percentage', 'DECIMAL(6,2) NULL AFTER `not_answered`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'rank_position', 'INT NULL AFTER `percentage`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'grade', 'VARCHAR(20) NULL AFTER `rank_position`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'result_status', 'ENUM(''auto_scored'',''pending_manual'',''final'') NOT NULL DEFAULT ''auto_scored'' AFTER `grade`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'result_visibility', 'ENUM(''hidden'',''score_only'',''full_feedback'') NOT NULL DEFAULT ''full_feedback'' AFTER `result_status`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'published_at', 'DATETIME NULL AFTER `result_visibility`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'analysis_json', 'JSON NULL AFTER `published_at`');
CALL onlineexam_add_column_if_missing('student_exam_results', 'feedback_json', 'JSON NULL AFTER `analysis_json`');

UPDATE `student_exam_results`
SET `total_questions` = COALESCE(`total_questions`, `answered` + `not_answered`),
    `percentage` = COALESCE(
      `percentage`,
      CASE
        WHEN (`answered` + `not_answered`) > 0
        THEN ROUND((`correct_count` / (`answered` + `not_answered`)) * 100, 2)
        ELSE NULL
      END
    );

CALL onlineexam_add_column_if_missing('submissions', 'submission_uid', 'VARCHAR(64) NULL AFTER `submission_id`');
CALL onlineexam_add_column_if_missing('submissions', 'attempt_id', 'BIGINT UNSIGNED NULL AFTER `submission_uid`');
CALL onlineexam_add_column_if_missing('submissions', 'duration_seconds', 'INT NULL AFTER `end_time`');
CALL onlineexam_add_column_if_missing('submissions', 'submitted_by', 'ENUM(''student'',''system'',''teacher'',''admin'') NULL AFTER `status`');
CALL onlineexam_add_column_if_missing('submissions', 'ip_address', 'VARCHAR(64) NULL AFTER `submitted_by`');
CALL onlineexam_add_column_if_missing('submissions', 'user_agent', 'VARCHAR(512) NULL AFTER `ip_address`');
CALL onlineexam_add_column_if_missing('submissions', 'anti_cheat_summary', 'JSON NULL AFTER `user_agent`');
CALL onlineexam_add_column_if_missing('submissions', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `anti_cheat_summary`');

UPDATE `submissions`
SET `submission_uid` = COALESCE(`submission_uid`, CONCAT('SUB-', `submission_id`));

-- ---------------------------------------------------------------------------
-- 2. Master data for institutions, boards, and exam authority models.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `institutions` (
  `institution_id` INT NOT NULL AUTO_INCREMENT,
  `institution_name` VARCHAR(200) NOT NULL,
  `institution_type` ENUM('school','college','coaching','other') NOT NULL DEFAULT 'school',
  `board_id` INT NULL,
  `logo_url` VARCHAR(500) NULL,
  `logo_blob` LONGBLOB NULL,
  `address` VARCHAR(500) NULL,
  `contact_email` VARCHAR(150) NULL,
  `contact_phone` VARCHAR(32) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`institution_id`),
  KEY `idx_institutions_board` (`board_id`),
  KEY `idx_institutions_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `boards` (
  `board_id` INT NOT NULL AUTO_INCREMENT,
  `board_code` VARCHAR(50) NOT NULL,
  `board_name` VARCHAR(150) NOT NULL,
  `country` VARCHAR(80) NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`board_id`),
  UNIQUE KEY `uq_boards_code` (`board_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `boards` (`board_code`, `board_name`, `country`, `description`)
VALUES
  ('CBSE', 'Central Board of Secondary Education', 'India', 'Indian national school board'),
  ('ICSE', 'Indian Certificate of Secondary Education', 'India', 'Indian school board'),
  ('STATE', 'State Board', 'India', 'Generic state board'),
  ('NTA', 'National Testing Agency', 'India', 'JEE and NEET style exams'),
  ('COLLEGE_BOARD', 'College Board', 'USA', 'SAT style adaptive exams')
ON DUPLICATE KEY UPDATE
  `board_name` = VALUES(`board_name`),
  `country` = VALUES(`country`),
  `description` = VALUES(`description`);

CREATE TABLE IF NOT EXISTS `exam_models` (
  `exam_model_id` INT NOT NULL AUTO_INCREMENT,
  `model_code` VARCHAR(50) NOT NULL,
  `model_name` VARCHAR(150) NOT NULL,
  `board_id` INT NULL,
  `authority_name` VARCHAR(150) NULL,
  `default_duration_minutes` INT NULL,
  `default_total_marks` DECIMAL(10,2) NULL,
  `is_adaptive` TINYINT(1) NOT NULL DEFAULT 0,
  `supports_print` TINYINT(1) NOT NULL DEFAULT 1,
  `supports_online` TINYINT(1) NOT NULL DEFAULT 1,
  `instructions` LONGTEXT NULL,
  `model_config` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`exam_model_id`),
  UNIQUE KEY `uq_exam_models_code` (`model_code`),
  KEY `idx_exam_models_board` (`board_id`),
  CONSTRAINT `fk_exam_models_board` FOREIGN KEY (`board_id`) REFERENCES `boards` (`board_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `exam_models`
  (`model_code`, `model_name`, `board_id`, `authority_name`, `default_duration_minutes`, `default_total_marks`, `is_adaptive`, `instructions`, `model_config`)
SELECT 'JEE_MAIN', 'IIT JEE Main', b.`board_id`, 'NTA', 180, 300, 0,
       'JEE Main style model with negative marking and subject sections.',
       JSON_OBJECT('negative_marking', true, 'subjects', JSON_ARRAY('Physics','Chemistry','Mathematics'))
FROM `boards` b WHERE b.`board_code` = 'NTA'
ON DUPLICATE KEY UPDATE `model_name` = VALUES(`model_name`);

INSERT INTO `exam_models`
  (`model_code`, `model_name`, `board_id`, `authority_name`, `default_duration_minutes`, `default_total_marks`, `is_adaptive`, `instructions`, `model_config`)
SELECT 'JEE_ADVANCED', 'IIT JEE Advanced', b.`board_id`, 'IIT', 180, NULL, 0,
       'JEE Advanced style model with multi-section, integer, matching, and MSQ support.',
       JSON_OBJECT('supports_partial_marking', true, 'sections', JSON_ARRAY('MCQ','MSQ','Integer','Matching','Matrix Matching'))
FROM `boards` b WHERE b.`board_code` = 'NTA'
ON DUPLICATE KEY UPDATE `model_name` = VALUES(`model_name`);

INSERT INTO `exam_models`
  (`model_code`, `model_name`, `board_id`, `authority_name`, `default_duration_minutes`, `default_total_marks`, `is_adaptive`, `instructions`, `model_config`)
SELECT 'NEET', 'NEET', b.`board_id`, 'NTA', 200, 720, 0,
       'NEET style model with Physics, Chemistry, Botany, and Zoology sections.',
       JSON_OBJECT('negative_marking', true)
FROM `boards` b WHERE b.`board_code` = 'NTA'
ON DUPLICATE KEY UPDATE `model_name` = VALUES(`model_name`);

INSERT INTO `exam_models`
  (`model_code`, `model_name`, `board_id`, `authority_name`, `default_duration_minutes`, `default_total_marks`, `is_adaptive`, `instructions`, `model_config`)
SELECT 'SAT_ADAPTIVE', 'SAT Adaptive', b.`board_id`, 'College Board', 134, 1600, 1,
       'SAT style adaptive model where module 2 difficulty depends on module 1 score.',
       JSON_OBJECT('adaptive_modules', 2, 'difficulty_after_module_1', true)
FROM `boards` b WHERE b.`board_code` = 'COLLEGE_BOARD'
ON DUPLICATE KEY UPDATE `model_name` = VALUES(`model_name`);

INSERT INTO `exam_models`
  (`model_code`, `model_name`, `board_id`, `authority_name`, `default_duration_minutes`, `default_total_marks`, `is_adaptive`, `instructions`, `model_config`)
SELECT 'EAMCET', 'EAMCET', b.`board_id`, 'State authority', 180, 160, 0,
       'EAMCET style timed exam model.',
       JSON_OBJECT('negative_marking', false)
FROM `boards` b WHERE b.`board_code` = 'STATE'
ON DUPLICATE KEY UPDATE `model_name` = VALUES(`model_name`);

INSERT INTO `exam_models`
  (`model_code`, `model_name`, `board_id`, `authority_name`, `default_duration_minutes`, `default_total_marks`, `is_adaptive`, `instructions`, `model_config`)
VALUES
  ('CUSTOM', 'Custom Exam Model', NULL, 'Institution', NULL, NULL, 0, 'Custom model controlled by exam settings.', JSON_OBJECT())
ON DUPLICATE KEY UPDATE `model_name` = VALUES(`model_name`);

CREATE TABLE IF NOT EXISTS `exam_model_sections` (
  `model_section_id` INT NOT NULL AUTO_INCREMENT,
  `exam_model_id` INT NOT NULL,
  `section_code` VARCHAR(40) NOT NULL,
  `section_name` VARCHAR(120) NOT NULL,
  `module_no` INT NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `total_questions` INT NULL,
  `attempt_count` INT NULL,
  `marks_per_question` DECIMAL(8,2) NULL,
  `negative_marks` DECIMAL(8,2) NULL,
  `question_type_rule` JSON NULL,
  `difficulty_policy` JSON NULL,
  `instructions` TEXT NULL,
  PRIMARY KEY (`model_section_id`),
  UNIQUE KEY `uq_model_section` (`exam_model_id`, `section_code`, `module_no`),
  CONSTRAINT `fk_exam_model_sections_model` FOREIGN KEY (`exam_model_id`) REFERENCES `exam_models` (`exam_model_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `exam_model_adaptive_rules` (
  `adaptive_rule_id` INT NOT NULL AUTO_INCREMENT,
  `exam_model_id` INT NOT NULL,
  `module_no` INT NOT NULL DEFAULT 1,
  `min_score` DECIMAL(8,2) NULL,
  `max_score` DECIMAL(8,2) NULL,
  `next_difficulty` ENUM('easy','moderate','difficult') NOT NULL,
  `rule_config` JSON NULL,
  PRIMARY KEY (`adaptive_rule_id`),
  KEY `idx_model_adaptive` (`exam_model_id`, `module_no`),
  CONSTRAINT `fk_model_adaptive_model` FOREIGN KEY (`exam_model_id`) REFERENCES `exam_models` (`exam_model_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 3. Roles, assignments, question bank, and imports.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_subject_assignments` (
  `assignment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `course_id` INT NULL,
  `subject_id` INT NULL,
  `role_scope` ENUM('admin','teacher','evaluator') NOT NULL DEFAULT 'teacher',
  `assigned_by` INT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uq_user_course_subject_scope` (`user_id`, `course_id`, `subject_id`, `role_scope`),
  KEY `idx_usa_subject` (`subject_id`),
  CONSTRAINT `fk_usa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usa_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_usa_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `question_import_batches` (
  `import_batch_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uploaded_by` INT NULL,
  `source_file_name` VARCHAR(255) NULL,
  `source_file_url` VARCHAR(500) NULL,
  `status` ENUM('uploaded','processing','completed','failed') NOT NULL DEFAULT 'uploaded',
  `rows_total` INT NOT NULL DEFAULT 0,
  `rows_success` INT NOT NULL DEFAULT 0,
  `rows_failed` INT NOT NULL DEFAULT 0,
  `error_report_json` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  PRIMARY KEY (`import_batch_id`),
  KEY `idx_import_uploaded_by` (`uploaded_by`),
  CONSTRAINT `fk_question_import_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `question_passages` (
  `passage_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NULL,
  `passage_text` LONGTEXT NULL,
  `passage_image_url` VARCHAR(500) NULL,
  `subject_id` INT NULL,
  `course_id` INT NULL,
  `board_id` INT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`passage_id`),
  KEY `idx_passage_subject` (`subject_id`),
  CONSTRAINT `fk_passage_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_passage_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_passage_board` FOREIGN KEY (`board_id`) REFERENCES `boards` (`board_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_passage_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CALL onlineexam_add_column_if_missing('questions_answers', 'question_uid', 'VARCHAR(64) NULL AFTER `id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'board_id', 'INT NULL AFTER `category_id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'exam_model_id', 'INT NULL AFTER `board_id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'exam_id', 'INT NULL AFTER `exam_model_id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'passage_id', 'BIGINT UNSIGNED NULL AFTER `question_type_id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'parent_question_id', 'INT NULL AFTER `passage_id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'question_format', 'ENUM(''text'',''image'',''math'',''science'',''passage'',''matching'',''matrix'',''coding'',''mixed'') NOT NULL DEFAULT ''text'' AFTER `question_text`');
CALL onlineexam_add_column_if_missing('questions_answers', 'question_payload', 'JSON NULL AFTER `question_format`');
CALL onlineexam_add_column_if_missing('questions_answers', 'options_json', 'JSON NULL AFTER `option4`');
CALL onlineexam_add_column_if_missing('questions_answers', 'correct_answer_json', 'JSON NULL AFTER `answer`');
CALL onlineexam_add_column_if_missing('questions_answers', 'correct_option', 'LONGTEXT NULL AFTER `correct_answer_json`');
CALL onlineexam_add_column_if_missing('questions_answers', 'solution_text', 'LONGTEXT NULL AFTER `correct_option`');
CALL onlineexam_add_column_if_missing('questions_answers', 'explanation', 'LONGTEXT NULL AFTER `solution_text`');
CALL onlineexam_add_column_if_missing('questions_answers', 'positive_marks', 'DECIMAL(8,2) NOT NULL DEFAULT 1.00 AFTER `answer_image`');
CALL onlineexam_add_column_if_missing('questions_answers', 'negative_marks', 'DECIMAL(8,2) NOT NULL DEFAULT 0.00 AFTER `positive_marks`');
CALL onlineexam_add_column_if_missing('questions_answers', 'time_limit_seconds', 'INT NULL AFTER `negative_marks`');
CALL onlineexam_add_column_if_missing('questions_answers', 'tags_json', 'JSON NULL AFTER `time_limit_seconds`');
CALL onlineexam_add_column_if_missing('questions_answers', 'source_type', 'ENUM(''manual'',''excel'',''pdf'',''api'') NOT NULL DEFAULT ''manual'' AFTER `tags_json`');
CALL onlineexam_add_column_if_missing('questions_answers', 'import_batch_id', 'BIGINT UNSIGNED NULL AFTER `source_type`');
CALL onlineexam_add_column_if_missing('questions_answers', 'owner_user_id', 'INT NULL AFTER `import_batch_id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'review_status', 'ENUM(''draft'',''reviewed'',''approved'',''rejected'',''archived'') NOT NULL DEFAULT ''approved'' AFTER `owner_user_id`');
CALL onlineexam_add_column_if_missing('questions_answers', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `review_status`');
CALL onlineexam_add_column_if_missing('questions_answers', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `is_active`');

UPDATE `questions_answers`
SET `question_uid` = COALESCE(`question_uid`, CONCAT('Q-', `id`)),
    `correct_answer_json` = COALESCE(`correct_answer_json`, JSON_ARRAY(`answer`)),
    `correct_option` = COALESCE(`correct_option`, `answer`),
    `options_json` = COALESCE(
      `options_json`,
      JSON_ARRAY(`option1`, `option2`, `option3`, `option4`)
    );

CREATE TABLE IF NOT EXISTS `question_assets` (
  `asset_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` INT NOT NULL,
  `asset_type` ENUM('question_image','option_image','answer_image','solution_image','audio','video','attachment') NOT NULL,
  `option_key` VARCHAR(20) NULL,
  `asset_url` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(120) NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`asset_id`),
  KEY `idx_question_assets_question` (`question_id`),
  CONSTRAINT `fk_question_assets_question` FOREIGN KEY (`question_id`) REFERENCES `questions_answers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `question_coding_test_cases` (
  `test_case_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` INT NOT NULL,
  `input_data` LONGTEXT NULL,
  `expected_output` LONGTEXT NULL,
  `is_hidden` TINYINT(1) NOT NULL DEFAULT 0,
  `weight` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`test_case_id`),
  KEY `idx_coding_cases_question` (`question_id`),
  CONSTRAINT `fk_coding_cases_question` FOREIGN KEY (`question_id`) REFERENCES `questions_answers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `question_tags` (
  `tag_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tag_name` VARCHAR(100) NOT NULL,
  `tag_group` VARCHAR(80) NULL,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `uq_question_tags_name` (`tag_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `question_tag_map` (
  `question_id` INT NOT NULL,
  `tag_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`question_id`, `tag_id`),
  CONSTRAINT `fk_qtm_question` FOREIGN KEY (`question_id`) REFERENCES `questions_answers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qtm_tag` FOREIGN KEY (`tag_id`) REFERENCES `question_tags` (`tag_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `question_types` (`type_name`, `description`)
VALUES
  ('Subjective', 'Teacher evaluated subjective response'),
  ('Short Answer', 'Short free text response'),
  ('Long Answer', 'Long free text response'),
  ('Coding', 'Programming question with test cases'),
  ('Image Matching', 'Match image options or image pairs'),
  ('Statement Type', 'Statement based question'),
  ('Numeric Decimal', 'Numeric answer with decimal tolerance')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ---------------------------------------------------------------------------
-- 4. Exam generation, attempts, answers, anti-cheat, and evaluation.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `exam_sections` (
  `section_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `exam_id` INT NOT NULL,
  `exam_model_section_id` INT NULL,
  `subject_id` INT NULL,
  `section_code` VARCHAR(40) NOT NULL,
  `section_name` VARCHAR(120) NOT NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `total_questions` INT NULL,
  `attempt_count` INT NULL,
  `marks_per_question` DECIMAL(8,2) NULL,
  `negative_marks` DECIMAL(8,2) NULL,
  `instructions` TEXT NULL,
  PRIMARY KEY (`section_id`),
  UNIQUE KEY `uq_exam_section_code` (`exam_id`, `section_code`),
  KEY `idx_exam_sections_subject` (`subject_id`),
  CONSTRAINT `fk_exam_sections_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_sections_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_exam_sections_model_section` FOREIGN KEY (`exam_model_section_id`) REFERENCES `exam_model_sections` (`model_section_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `exam_generation_rules` (
  `rule_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `exam_id` INT NOT NULL,
  `section_id` BIGINT UNSIGNED NULL,
  `course_id` INT NULL,
  `subject_id` INT NULL,
  `chapter_id` INT NULL,
  `level_id` INT NULL,
  `question_type_id` INT NULL,
  `question_count` INT NOT NULL,
  `marks` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  `negative_marks` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `selection_mode` ENUM('random','fixed','adaptive') NOT NULL DEFAULT 'random',
  `rule_config` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `idx_generation_exam` (`exam_id`),
  KEY `idx_generation_filters` (`course_id`, `subject_id`, `chapter_id`, `level_id`, `question_type_id`),
  CONSTRAINT `fk_generation_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_generation_section` FOREIGN KEY (`section_id`) REFERENCES `exam_sections` (`section_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `exam_attempts` (
  `attempt_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attempt_uid` VARCHAR(64) NULL,
  `exam_id` INT NULL,
  `student_id` INT NOT NULL,
  `attempt_type` ENUM('my_exam','practice','worksheet') NOT NULL DEFAULT 'my_exam',
  `source_id` VARCHAR(64) NULL,
  `attempt_no` INT NOT NULL DEFAULT 1,
  `status` ENUM('not_started','in_progress','submitted','auto_submitted','timeout','evaluated','cancelled') NOT NULL DEFAULT 'in_progress',
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` DATETIME NULL,
  `duration_seconds` INT NULL,
  `total_questions` INT NOT NULL DEFAULT 0,
  `answered_count` INT NOT NULL DEFAULT 0,
  `not_answered_count` INT NOT NULL DEFAULT 0,
  `marked_for_review_count` INT NOT NULL DEFAULT 0,
  `correct_count` INT NOT NULL DEFAULT 0,
  `wrong_count` INT NOT NULL DEFAULT 0,
  `total_marks` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `percentage` DECIMAL(6,2) NULL,
  `rank_position` INT NULL,
  `grade` VARCHAR(20) NULL,
  `result_status` ENUM('auto_scored','pending_manual','final') NOT NULL DEFAULT 'auto_scored',
  `result_visibility` ENUM('hidden','score_only','full_feedback') NOT NULL DEFAULT 'full_feedback',
  `client_state_json` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`attempt_id`),
  UNIQUE KEY `uq_attempt_uid` (`attempt_uid`),
  KEY `idx_attempt_exam_student` (`exam_id`, `student_id`),
  KEY `idx_attempt_student_type` (`student_id`, `attempt_type`, `status`),
  CONSTRAINT `fk_attempt_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attempt_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `exam_attempt_questions` (
  `attempt_question_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attempt_id` BIGINT UNSIGNED NOT NULL,
  `exam_id` INT NULL,
  `question_id` INT NOT NULL,
  `section_id` BIGINT UNSIGNED NULL,
  `section_code` VARCHAR(40) NULL,
  `question_order` INT NOT NULL,
  `marks` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  `negative_marks` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `question_snapshot` JSON NULL,
  PRIMARY KEY (`attempt_question_id`),
  UNIQUE KEY `uq_attempt_question` (`attempt_id`, `question_id`),
  KEY `idx_attempt_questions_order` (`attempt_id`, `section_code`, `question_order`),
  CONSTRAINT `fk_attempt_questions_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`attempt_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attempt_questions_question` FOREIGN KEY (`question_id`) REFERENCES `questions_answers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `exam_attempt_answers` (
  `attempt_answer_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attempt_id` BIGINT UNSIGNED NOT NULL,
  `attempt_question_id` BIGINT UNSIGNED NOT NULL,
  `question_id` INT NOT NULL,
  `answer_text` LONGTEXT NULL,
  `answer_json` JSON NULL,
  `answer_file_url` VARCHAR(500) NULL,
  `status` ENUM('not_attempted','answered','marked_for_review','answered_marked_for_review') NOT NULL DEFAULT 'not_attempted',
  `is_correct` TINYINT(1) NULL,
  `marks_awarded` DECIMAL(10,2) NULL,
  `auto_scored_at` DATETIME NULL,
  `manual_score_status` ENUM('not_required','pending','scored','returned') NOT NULL DEFAULT 'not_required',
  `evaluated_by` INT NULL,
  `evaluated_at` DATETIME NULL,
  `evaluator_comments` TEXT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`attempt_answer_id`),
  UNIQUE KEY `uq_attempt_answer_question` (`attempt_id`, `question_id`),
  KEY `idx_attempt_answers_question` (`question_id`),
  CONSTRAINT `fk_attempt_answers_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`attempt_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attempt_answers_attempt_question` FOREIGN KEY (`attempt_question_id`) REFERENCES `exam_attempt_questions` (`attempt_question_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attempt_answers_question` FOREIGN KEY (`question_id`) REFERENCES `questions_answers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_attempt_answers_evaluator` FOREIGN KEY (`evaluated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `manual_evaluations` (
  `evaluation_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attempt_answer_id` BIGINT UNSIGNED NOT NULL,
  `evaluator_id` INT NOT NULL,
  `marks_awarded` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `max_marks` DECIMAL(10,2) NULL,
  `comments` TEXT NULL,
  `rubric_json` JSON NULL,
  `evaluated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evaluation_id`),
  KEY `idx_manual_eval_answer` (`attempt_answer_id`),
  CONSTRAINT `fk_manual_eval_answer` FOREIGN KEY (`attempt_answer_id`) REFERENCES `exam_attempt_answers` (`attempt_answer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_manual_eval_user` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `attempt_events` (
  `event_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attempt_id` BIGINT UNSIGNED NOT NULL,
  `event_type` ENUM('start','answer_save','section_change','fullscreen_exit','copy_attempt','paste_attempt','tab_switch','network_loss','resume','submit','auto_submit') NOT NULL,
  `event_payload` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `idx_attempt_events_attempt` (`attempt_id`, `created_at`),
  CONSTRAINT `fk_attempt_events_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`attempt_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 5. Practice tests and worksheets.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `practice_sessions` (
  `practice_session_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `practice_uid` VARCHAR(64) NULL,
  `student_id` INT NOT NULL,
  `attempt_id` BIGINT UNSIGNED NULL,
  `category_id` INT NULL,
  `course_id` INT NULL,
  `subject_id` INT NULL,
  `chapter_id` INT NULL,
  `level_id` INT NULL,
  `question_type_id` INT NULL,
  `question_count` INT NOT NULL DEFAULT 10,
  `duration_minutes` INT NULL,
  `generation_seed` VARCHAR(64) NULL,
  `filters_json` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`practice_session_id`),
  UNIQUE KEY `uq_practice_uid` (`practice_uid`),
  KEY `idx_practice_student` (`student_id`, `created_at`),
  CONSTRAINT `fk_practice_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_practice_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`attempt_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `worksheets` (
  `worksheet_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `worksheet_uid` VARCHAR(64) NULL,
  `title` VARCHAR(200) NOT NULL,
  `teacher_id` INT NOT NULL,
  `institution_id` INT NULL,
  `course_id` INT NULL,
  `subject_id` INT NULL,
  `chapter_id` INT NULL,
  `level_id` INT NULL,
  `class_name` VARCHAR(40) NULL,
  `schoolname` VARCHAR(200) NULL,
  `delivery_mode` ENUM('online','print','both') NOT NULL DEFAULT 'both',
  `question_count` INT NOT NULL DEFAULT 0,
  `duration_minutes` INT NULL,
  `instructions` TEXT NULL,
  `generated_pdf_url` VARCHAR(500) NULL,
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`worksheet_id`),
  UNIQUE KEY `uq_worksheet_uid` (`worksheet_uid`),
  KEY `idx_worksheets_teacher` (`teacher_id`, `created_at`),
  KEY `idx_worksheets_topic` (`course_id`, `subject_id`, `chapter_id`, `level_id`),
  CONSTRAINT `fk_worksheets_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_worksheets_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `worksheet_questions` (
  `worksheet_question_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `worksheet_id` BIGINT UNSIGNED NOT NULL,
  `question_id` INT NOT NULL,
  `question_order` INT NOT NULL DEFAULT 1,
  `marks` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (`worksheet_question_id`),
  UNIQUE KEY `uq_worksheet_question` (`worksheet_id`, `question_id`),
  CONSTRAINT `fk_wq_worksheet` FOREIGN KEY (`worksheet_id`) REFERENCES `worksheets` (`worksheet_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wq_question` FOREIGN KEY (`question_id`) REFERENCES `questions_answers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `worksheet_assignments` (
  `worksheet_assignment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `worksheet_id` BIGINT UNSIGNED NOT NULL,
  `student_id` INT NOT NULL,
  `assigned_by` INT NULL,
  `status` ENUM('assigned','revoked','completed') NOT NULL DEFAULT 'assigned',
  `visible_from` DATETIME NULL,
  `visible_to` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`worksheet_assignment_id`),
  UNIQUE KEY `uq_worksheet_student` (`worksheet_id`, `student_id`),
  CONSTRAINT `fk_wa_worksheet` FOREIGN KEY (`worksheet_id`) REFERENCES `worksheets` (`worksheet_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wa_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wa_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 6. Parent portal, notifications, packages, and audit.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `parent_student_links` (
  `link_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `relationship` VARCHAR(50) NULL,
  `can_view_results` TINYINT(1) NOT NULL DEFAULT 1,
  `can_receive_notifications` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('pending','verified','blocked') NOT NULL DEFAULT 'pending',
  `verified_by` INT NULL,
  `verified_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`link_id`),
  UNIQUE KEY `uq_parent_student` (`parent_id`, `student_id`),
  KEY `idx_parent_student_student` (`student_id`),
  CONSTRAINT `fk_psl_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_psl_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_psl_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `parent_meeting_requests` (
  `meeting_request_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `requested_slot` DATETIME NULL,
  `topic` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `status` ENUM('requested','scheduled','completed','cancelled') NOT NULL DEFAULT 'requested',
  `assigned_to` INT NULL,
  `meeting_link` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`meeting_request_id`),
  KEY `idx_parent_meeting_parent` (`parent_id`, `status`),
  KEY `idx_parent_meeting_student` (`student_id`, `status`),
  CONSTRAINT `fk_pmr_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pmr_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pmr_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `notification_templates` (
  `template_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_key` VARCHAR(100) NOT NULL,
  `channel` ENUM('email','whatsapp','sms','in_app') NOT NULL,
  `subject` VARCHAR(255) NULL,
  `body_template` LONGTEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `uq_template_channel` (`template_key`, `channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `notification_logs` (
  `notification_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT UNSIGNED NULL,
  `recipient_user_id` INT NULL,
  `student_id` INT NULL,
  `exam_id` INT NULL,
  `attempt_id` BIGINT UNSIGNED NULL,
  `channel` ENUM('email','whatsapp','sms','in_app') NOT NULL,
  `recipient_address` VARCHAR(255) NULL,
  `subject` VARCHAR(255) NULL,
  `body` LONGTEXT NULL,
  `status` ENUM('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
  `provider_message_id` VARCHAR(255) NULL,
  `error_message` TEXT NULL,
  `queued_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` DATETIME NULL,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notification_recipient` (`recipient_user_id`, `status`),
  KEY `idx_notification_exam` (`exam_id`, `student_id`),
  CONSTRAINT `fk_notification_template` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`template_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notification_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notification_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notification_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`attempt_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CALL onlineexam_add_column_if_missing('packages', 'currency', 'VARCHAR(10) NOT NULL DEFAULT ''INR'' AFTER `amount`');
CALL onlineexam_add_column_if_missing('packages', 'valid_days', 'INT NULL AFTER `description`');
CALL onlineexam_add_column_if_missing('packages', 'status', 'ENUM(''active'',''inactive'',''archived'') NOT NULL DEFAULT ''active'' AFTER `valid_days`');
CALL onlineexam_add_column_if_missing('packages', 'package_config', 'JSON NULL AFTER `status`');

CREATE TABLE IF NOT EXISTS `student_package_access` (
  `access_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `package_id` INT NOT NULL,
  `granted_by` INT NULL,
  `payment_reference` VARCHAR(150) NULL,
  `starts_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  `status` ENUM('active','expired','revoked') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`access_id`),
  UNIQUE KEY `uq_student_package` (`student_id`, `package_id`),
  CONSTRAINT `fk_spa_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spa_package` FOREIGN KEY (`package_id`) REFERENCES `packages` (`package_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spa_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `audit_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(80) NOT NULL,
  `entity_id` VARCHAR(80) NULL,
  `before_json` JSON NULL,
  `after_json` JSON NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` VARCHAR(512) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `idx_audit_actor` (`actor_user_id`, `created_at`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `analytics_snapshots` (
  `snapshot_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `snapshot_type` ENUM('student','exam','subject','platform','parent') NOT NULL,
  `entity_id` VARCHAR(80) NOT NULL,
  `metric_date` DATE NOT NULL,
  `metrics_json` JSON NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`snapshot_id`),
  UNIQUE KEY `uq_analytics_snapshot` (`snapshot_type`, `entity_id`, `metric_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- 7. Indexes for performance.
-- ---------------------------------------------------------------------------

CALL onlineexam_add_index_if_missing('users', 'idx_users_role_active', 'ADD INDEX `idx_users_role_active` (`role`, `is_active`)');
CALL onlineexam_add_index_if_missing('users', 'idx_users_status', 'ADD INDEX `idx_users_status` (`status`)');
CALL onlineexam_add_index_if_missing('users', 'idx_users_school_class', 'ADD INDEX `idx_users_school_class` (`schoolname`, `class`, `section`)');

CALL onlineexam_add_index_if_missing('exams', 'idx_exams_status_window', 'ADD INDEX `idx_exams_status_window` (`status`, `start_time`, `end_time`)');
CALL onlineexam_add_index_if_missing('exams', 'idx_exams_model', 'ADD INDEX `idx_exams_model` (`exam_model_id`, `exam_mode`, `generation_mode`)');
CALL onlineexam_add_index_if_missing('exams', 'idx_exams_course', 'ADD INDEX `idx_exams_course` (`course_id`)');

CALL onlineexam_add_index_if_missing('exam_students', 'idx_exam_students_student_status', 'ADD INDEX `idx_exam_students_student_status` (`student_id`, `status`)');
CALL onlineexam_add_index_if_missing('exam_question_mapping', 'idx_eqm_exam_subject_order', 'ADD INDEX `idx_eqm_exam_subject_order` (`exam_id`, `subject_id`, `order_no`)');
CALL onlineexam_add_index_if_missing('exam_question_mapping', 'idx_eqm_question_type_level', 'ADD INDEX `idx_eqm_question_type_level` (`question_type_id`, `level_id`)');

CALL onlineexam_add_index_if_missing('questions_answers', 'idx_qa_generation_filters', 'ADD INDEX `idx_qa_generation_filters` (`course_id`, `subject_id`, `chapter_id`, `level_id`, `question_type_id`, `is_active`)');
CALL onlineexam_add_index_if_missing('questions_answers', 'idx_qa_board_model', 'ADD INDEX `idx_qa_board_model` (`board_id`, `exam_model_id`)');
CALL onlineexam_add_index_if_missing('questions_answers', 'uq_qa_question_uid', 'ADD UNIQUE INDEX `uq_qa_question_uid` (`question_uid`)');

CALL onlineexam_add_index_if_missing('student_exam_results', 'idx_ser_exam_user', 'ADD INDEX `idx_ser_exam_user` (`exam_id`, `user_id`)');
CALL onlineexam_add_index_if_missing('student_exam_results', 'idx_ser_user_created', 'ADD INDEX `idx_ser_user_created` (`user_id`, `created_at`)');
CALL onlineexam_add_index_if_missing('student_exam_answers', 'idx_sea_exam_user_question', 'ADD INDEX `idx_sea_exam_user_question` (`exam_id`, `user_id`, `question_id`)');
CALL onlineexam_add_index_if_missing('submissions', 'idx_submissions_exam_student_status', 'ADD INDEX `idx_submissions_exam_student_status` (`exam_id`, `student_id`, `status`)');

-- ---------------------------------------------------------------------------
-- 8. Views for analytics, rankings, and parent portal.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW `v_student_latest_exam_results` AS
SELECT
  ser.`id`,
  ser.`exam_id`,
  e.`title` AS `exam_title`,
  ser.`user_id` AS `student_id`,
  u.`name` AS `student_name`,
  u.`email` AS `student_email`,
  u.`schoolname`,
  u.`class`,
  ser.`total_marks`,
  ser.`correct_count`,
  ser.`wrong_count`,
  ser.`answered`,
  ser.`not_answered`,
  ser.`percentage`,
  ser.`rank_position`,
  ser.`grade`,
  ser.`result_status`,
  ser.`result_visibility`,
  ser.`created_at`
FROM `student_exam_results` ser
JOIN `users` u ON u.`user_id` = ser.`user_id`
LEFT JOIN `exams` e ON e.`exam_id` = ser.`exam_id`;

CREATE OR REPLACE VIEW `v_exam_rankings` AS
SELECT
  ser.`exam_id`,
  ser.`user_id` AS `student_id`,
  u.`name` AS `student_name`,
  ser.`total_marks`,
  ser.`percentage`,
  ser.`created_at`,
  RANK() OVER (
    PARTITION BY ser.`exam_id`
    ORDER BY ser.`total_marks` DESC, ser.`created_at` ASC, ser.`user_id` ASC
  ) AS `rank_position`
FROM `student_exam_results` ser
JOIN `users` u ON u.`user_id` = ser.`user_id`;

CREATE OR REPLACE VIEW `v_parent_result_summary` AS
SELECT
  psl.`parent_id`,
  p.`name` AS `parent_name`,
  psl.`student_id`,
  s.`name` AS `student_name`,
  ser.`exam_id`,
  e.`title` AS `exam_title`,
  ser.`total_marks`,
  ser.`percentage`,
  ser.`rank_position`,
  ser.`grade`,
  ser.`created_at`
FROM `parent_student_links` psl
JOIN `users` p ON p.`user_id` = psl.`parent_id`
JOIN `users` s ON s.`user_id` = psl.`student_id`
JOIN `student_exam_results` ser ON ser.`user_id` = psl.`student_id`
LEFT JOIN `exams` e ON e.`exam_id` = ser.`exam_id`
WHERE psl.`status` = 'verified'
  AND psl.`can_view_results` = 1;

CREATE OR REPLACE VIEW `v_question_bank_coverage` AS
SELECT
  qa.`course_id`,
  c.`course_name`,
  qa.`subject_id`,
  s.`subject_name`,
  qa.`chapter_id`,
  ch.`chapter_name`,
  qa.`level_id`,
  dl.`level_name`,
  qa.`question_type_id`,
  qt.`type_name`,
  COUNT(*) AS `question_count`
FROM `questions_answers` qa
LEFT JOIN `courses` c ON c.`course_id` = qa.`course_id`
LEFT JOIN `subjects` s ON s.`subject_id` = qa.`subject_id`
LEFT JOIN `chapters` ch ON ch.`chapter_id` = qa.`chapter_id`
LEFT JOIN `difficulty_levels` dl ON dl.`level_id` = qa.`level_id`
LEFT JOIN `question_types` qt ON qt.`question_type_id` = qa.`question_type_id`
WHERE qa.`is_active` = 1
GROUP BY
  qa.`course_id`, c.`course_name`,
  qa.`subject_id`, s.`subject_name`,
  qa.`chapter_id`, ch.`chapter_name`,
  qa.`level_id`, dl.`level_name`,
  qa.`question_type_id`, qt.`type_name`;

CREATE OR REPLACE VIEW `questions` AS
SELECT
  eqm.`question_id` AS `question_id`,
  eqm.`exam_id` AS `exam_id`,
  qa.`question_text` AS `question_text`,
  qa.`answer` AS `correct_option`,
  eqm.`marks` AS `positive_marks`,
  eqm.`negative_marks` AS `negative_marks`,
  qa.`id` AS `bank_question_id`,
  qa.`course_id`,
  qa.`subject_id`,
  qa.`chapter_id`,
  qa.`level_id`,
  qa.`question_type_id`
FROM `exam_question_mapping` eqm
JOIN `questions_answers` qa ON qa.`id` = eqm.`question_id`;

-- ---------------------------------------------------------------------------
-- 9. Lightweight triggers to keep old status/is_active behavior in sync.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_users_bi_status_sync`;
DROP TRIGGER IF EXISTS `trg_users_bu_status_sync`;
DROP TRIGGER IF EXISTS `trg_eqm_bi_backfill_question_meta`;
DROP TRIGGER IF EXISTS `trg_eqm_bu_backfill_question_meta`;

DELIMITER $$

CREATE TRIGGER `trg_users_bi_status_sync`
BEFORE INSERT ON `users`
FOR EACH ROW
BEGIN
  IF NEW.`status` IS NULL THEN
    SET NEW.`status` = CASE WHEN COALESCE(NEW.`is_active`, 1) = 1 THEN 'active' ELSE 'inactive' END;
  ELSEIF NEW.`is_active` = 0 AND NEW.`status` = 'active' THEN
    SET NEW.`status` = 'inactive';
  ELSE
    SET NEW.`is_active` = CASE WHEN NEW.`status` = 'active' THEN 1 ELSE 0 END;
  END IF;
END$$

CREATE TRIGGER `trg_users_bu_status_sync`
BEFORE UPDATE ON `users`
FOR EACH ROW
BEGIN
  IF NEW.`status` <> OLD.`status` THEN
    SET NEW.`is_active` = CASE WHEN NEW.`status` = 'active' THEN 1 ELSE 0 END;
  ELSEIF NEW.`is_active` <> OLD.`is_active` THEN
    SET NEW.`status` = CASE WHEN NEW.`is_active` = 1 THEN 'active' ELSE 'inactive' END;
  END IF;
END$$

CREATE TRIGGER `trg_eqm_bi_backfill_question_meta`
BEFORE INSERT ON `exam_question_mapping`
FOR EACH ROW
BEGIN
  DECLARE v_subject_id INT DEFAULT NULL;
  DECLARE v_question_type_id INT DEFAULT NULL;
  DECLARE v_level_id INT DEFAULT NULL;
  IF NEW.`subject_id` IS NULL OR NEW.`question_type_id` IS NULL OR NEW.`level_id` IS NULL THEN
    SELECT qa.`subject_id`, qa.`question_type_id`, qa.`level_id`
      INTO v_subject_id, v_question_type_id, v_level_id
    FROM `questions_answers` qa
    WHERE qa.`id` = NEW.`question_id`
    LIMIT 1;
    SET NEW.`subject_id` = COALESCE(NEW.`subject_id`, v_subject_id);
    SET NEW.`question_type_id` = COALESCE(NEW.`question_type_id`, v_question_type_id);
    SET NEW.`level_id` = COALESCE(NEW.`level_id`, v_level_id);
  END IF;
END$$

CREATE TRIGGER `trg_eqm_bu_backfill_question_meta`
BEFORE UPDATE ON `exam_question_mapping`
FOR EACH ROW
BEGIN
  DECLARE v_subject_id INT DEFAULT NULL;
  DECLARE v_question_type_id INT DEFAULT NULL;
  DECLARE v_level_id INT DEFAULT NULL;
  IF NEW.`question_id` <> OLD.`question_id`
     OR NEW.`subject_id` IS NULL
     OR NEW.`question_type_id` IS NULL
     OR NEW.`level_id` IS NULL THEN
    SELECT qa.`subject_id`, qa.`question_type_id`, qa.`level_id`
      INTO v_subject_id, v_question_type_id, v_level_id
    FROM `questions_answers` qa
    WHERE qa.`id` = NEW.`question_id`
    LIMIT 1;
    SET NEW.`subject_id` = COALESCE(NEW.`subject_id`, v_subject_id);
    SET NEW.`question_type_id` = COALESCE(NEW.`question_type_id`, v_question_type_id);
    SET NEW.`level_id` = COALESCE(NEW.`level_id`, v_level_id);
  END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 10. Recommended deprecation targets.
-- ---------------------------------------------------------------------------
-- Keep these tables until the backend is migrated, but avoid new feature work on
-- duplicate result/submission tables:
--   student_answers          -> replace with exam_attempt_answers
--   student_exam_answers     -> keep as compatibility, replace with exam_attempt_answers
--   student_exam_attempts    -> keep as compatibility, replace with exam_attempts
--   student_exams            -> keep as compatibility, replace with exam_attempts/results
--   practice_results         -> keep as compatibility, replace with practice_sessions + exam_attempts
--   submissions              -> keep as compatibility, link to exam_attempts via attempt_id

DROP PROCEDURE IF EXISTS onlineexam_add_column_if_missing;
DROP PROCEDURE IF EXISTS onlineexam_add_index_if_missing;

SET FOREIGN_KEY_CHECKS = 1;
