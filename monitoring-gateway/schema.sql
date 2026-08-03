CREATE TABLE IF NOT EXISTS `settings` (
  `Key` VARCHAR(100) PRIMARY KEY,
  `Value` LONGTEXT NULL,
  `UpdatedAt` VARCHAR(40) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `UserId` VARCHAR(80) PRIMARY KEY,
  `Username` VARCHAR(100) NOT NULL,
  `FullName` VARCHAR(255) NOT NULL,
  `Role` VARCHAR(30) NOT NULL,
  `PasswordHash` VARCHAR(255) NOT NULL,
  `Salt` VARCHAR(100) NOT NULL,
  `Active` TINYINT(1) NOT NULL DEFAULT 1,
  `MustChangePassword` TINYINT(1) NOT NULL DEFAULT 1,
  `CreatedAt` VARCHAR(40) NULL,
  `UpdatedAt` VARCHAR(40) NULL,
  UNIQUE KEY `uq_users_username` (`Username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `room_types` (
  `RoomTypeId` VARCHAR(80) PRIMARY KEY,
  `Name` VARCHAR(255) NOT NULL,
  `TemplateSheet` VARCHAR(255) NULL,
  `WorkDays` INT NOT NULL DEFAULT 6,
  `Active` TINYINT(1) NOT NULL DEFAULT 1,
  `SortOrder` INT NOT NULL DEFAULT 0,
  `CreatedAt` VARCHAR(40) NULL,
  `UpdatedAt` VARCHAR(40) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rooms` (
  `RoomId` VARCHAR(80) PRIMARY KEY,
  `Code` VARCHAR(100) NOT NULL,
  `Name` VARCHAR(255) NOT NULL,
  `RoomTypeId` VARCHAR(80) NULL,
  `QrToken` VARCHAR(255) NOT NULL,
  `Active` TINYINT(1) NOT NULL DEFAULT 1,
  `SortOrder` INT NOT NULL DEFAULT 0,
  `CreatedAt` VARCHAR(40) NULL,
  `UpdatedAt` VARCHAR(40) NULL,
  UNIQUE KEY `uq_rooms_code` (`Code`),
  UNIQUE KEY `uq_rooms_qr_token` (`QrToken`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activities` (
  `ActivityId` VARCHAR(80) PRIMARY KEY,
  `RoomTypeId` VARCHAR(80) NULL,
  `Name` VARCHAR(255) NOT NULL,
  `QualityApplicable` TINYINT(1) NOT NULL DEFAULT 0,
  `QualityPositive` VARCHAR(255) NULL,
  `QualityNegative` VARCHAR(255) NULL,
  `FunctionApplicable` TINYINT(1) NOT NULL DEFAULT 0,
  `FunctionPositive` VARCHAR(255) NULL,
  `FunctionNegative` VARCHAR(255) NULL,
  `ExportRow` INT NULL,
  `Active` TINYINT(1) NOT NULL DEFAULT 1,
  `SortOrder` INT NOT NULL DEFAULT 0,
  `CreatedAt` VARCHAR(40) NULL,
  `UpdatedAt` VARCHAR(40) NULL,
  KEY `idx_activities_room_type` (`RoomTypeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `room_activities` (
  `MapId` VARCHAR(80) PRIMARY KEY,
  `RoomId` VARCHAR(80) NOT NULL,
  `ActivityId` VARCHAR(80) NOT NULL,
  `Active` TINYINT(1) NOT NULL DEFAULT 1,
  `SortOrder` INT NOT NULL DEFAULT 0,
  `CreatedAt` VARCHAR(40) NULL,
  `UpdatedAt` VARCHAR(40) NULL,
  UNIQUE KEY `uq_room_activity` (`RoomId`, `ActivityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slots` (
  `SlotId` VARCHAR(100) PRIMARY KEY,
  `RoomTypeId` VARCHAR(80) NOT NULL,
  `Code` VARCHAR(100) NOT NULL,
  `Name` VARCHAR(255) NOT NULL,
  `Role` VARCHAR(30) NOT NULL,
  `SortOrder` INT NOT NULL DEFAULT 0,
  `Active` TINYINT(1) NOT NULL DEFAULT 1,
  `CreatedAt` VARCHAR(40) NULL,
  `UpdatedAt` VARCHAR(40) NULL,
  UNIQUE KEY `uq_slots_room_type_code` (`RoomTypeId`, `Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scan_events` (
  `ScanId` VARCHAR(80) PRIMARY KEY,
  `RoomId` VARCHAR(80) NOT NULL,
  `UserId` VARCHAR(80) NOT NULL,
  `ScannedAt` VARCHAR(40) NOT NULL,
  `UserAgent` VARCHAR(1000) NULL,
  `QrPayload` VARCHAR(1000) NULL,
  KEY `idx_scan_room_time` (`RoomId`, `ScannedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inspections` (
  `InspectionId` VARCHAR(80) PRIMARY KEY,
  `DateKey` VARCHAR(10) NOT NULL,
  `WeekStart` VARCHAR(10) NULL,
  `DayNumber` INT NULL,
  `RoomId` VARCHAR(80) NOT NULL,
  `RoomTypeId` VARCHAR(80) NOT NULL,
  `SlotId` VARCHAR(100) NOT NULL,
  `SlotCode` VARCHAR(100) NULL,
  `UserId` VARCHAR(80) NOT NULL,
  `ScanId` VARCHAR(80) NULL,
  `ScannedAt` VARCHAR(40) NULL,
  `SubmittedAt` VARCHAR(40) NOT NULL,
  `OverallStatus` VARCHAR(40) NOT NULL,
  `DirtyCount` INT NOT NULL DEFAULT 0,
  `EvidenceFileId` VARCHAR(1000) NULL,
  `EvidenceName` VARCHAR(255) NULL,
  `State` VARCHAR(40) NOT NULL,
  `BackupStatus` VARCHAR(40) NULL,
  `BackupUpdatedAt` VARCHAR(40) NULL,
  `ReopenedAt` VARCHAR(40) NULL,
  `ReopenedBy` VARCHAR(80) NULL,
  KEY `idx_inspections_period` (`DateKey`, `RoomId`, `SlotId`),
  KEY `idx_inspections_submitted` (`SubmittedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inspection_details` (
  `DetailId` VARCHAR(80) PRIMARY KEY,
  `InspectionId` VARCHAR(80) NOT NULL,
  `ActivityId` VARCHAR(80) NOT NULL,
  `QualityResult` VARCHAR(40) NULL,
  `QualityLabel` VARCHAR(255) NULL,
  `FunctionResult` VARCHAR(40) NULL,
  `FunctionLabel` VARCHAR(255) NULL,
  `Status` VARCHAR(40) NULL,
  `FuncStatus` VARCHAR(40) NULL,
  `Note` TEXT NULL,
  `PhotoFileId` VARCHAR(1000) NULL,
  `CorrectedAt` VARCHAR(40) NULL,
  `CorrectedBy` VARCHAR(80) NULL,
  KEY `idx_details_inspection` (`InspectionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backup_queue` (
  `QueueId` VARCHAR(80) PRIMARY KEY,
  `InspectionId` VARCHAR(80) NULL,
  `EventType` VARCHAR(80) NOT NULL,
  `PayloadJson` LONGTEXT NULL,
  `Status` VARCHAR(40) NOT NULL,
  `AttemptCount` INT NOT NULL DEFAULT 0,
  `LastError` TEXT NULL,
  `CreatedAt` VARCHAR(40) NULL,
  `UpdatedAt` VARCHAR(40) NULL,
  KEY `idx_queue_status` (`Status`, `CreatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `SessionHash` VARCHAR(128) PRIMARY KEY,
  `UserId` VARCHAR(80) NOT NULL,
  `ExpiresAt` VARCHAR(40) NOT NULL,
  `CreatedAt` VARCHAR(40) NOT NULL,
  KEY `idx_sessions_user` (`UserId`),
  KEY `idx_sessions_expiry` (`ExpiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `AuditId` VARCHAR(80) PRIMARY KEY,
  `UserId` VARCHAR(80) NULL,
  `Action` VARCHAR(100) NOT NULL,
  `EntityType` VARCHAR(100) NULL,
  `EntityId` VARCHAR(255) NULL,
  `Detail` LONGTEXT NULL,
  `CreatedAt` VARCHAR(40) NOT NULL,
  KEY `idx_audit_created` (`CreatedAt`),
  KEY `idx_audit_entity` (`EntityType`, `EntityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
