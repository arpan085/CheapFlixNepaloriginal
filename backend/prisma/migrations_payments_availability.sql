-- Payments + Availability upgrade (apply with: prisma migrate dev --name payments-availability)
-- If you deploy with `prisma migrate deploy`, move this into a timestamped
-- migration folder instead. Safe to run twice (IF NOT EXISTS / guards).

ALTER TABLE `Provider` ADD COLUMN IF NOT EXISTS `isAvailable` BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE `Provider` ADD COLUMN IF NOT EXISTS `weeklyOff` TEXT NULL;

CREATE TABLE IF NOT EXISTS `Payment` (
  `id` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `method` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `reference` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'claimed',
  `verifyMode` VARCHAR(191) NOT NULL DEFAULT 'format',
  `verifyNote` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Payment_bookingId_idx` (`bookingId`),
  INDEX `Payment_userId_status_idx` (`userId`, `status`),
  INDEX `Payment_reference_idx` (`reference`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProviderDayOff` (
  `id` VARCHAR(191) NOT NULL,
  `providerId` VARCHAR(191) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `slots` TEXT NULL,
  `reason` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProviderDayOff_providerId_date_key` (`providerId`, `date`),
  INDEX `ProviderDayOff_providerId_date_idx` (`providerId`, `date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS `Booking_providerId_date_startTime_idx` ON `Booking` (`providerId`, `date`, `startTime`);
CREATE INDEX IF NOT EXISTS `Booking_userId_status_idx` ON `Booking` (`userId`, `status`);
CREATE INDEX IF NOT EXISTS `Booking_status_date_idx` ON `Booking` (`status`, `date`);

-- SMS OTP codes for phone login
CREATE TABLE IF NOT EXISTS `OtpCode` (
  `id` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `OtpCode_phone_key` (`phone`),
  INDEX `OtpCode_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Server-side favorites
CREATE TABLE IF NOT EXISTS `Favorite` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `providerId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Favorite_userId_providerId_key` (`userId`, `providerId`),
  INDEX `Favorite_userId_idx` (`userId`),
  INDEX `Favorite_providerId_idx` (`providerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Admin-managed promo codes
CREATE TABLE IF NOT EXISTS `PromoCode` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `value` DOUBLE NOT NULL,
  `maxOff` DOUBLE NULL,
  `minTotal` DOUBLE NOT NULL DEFAULT 0,
  `firstBookingOnly` BOOLEAN NOT NULL DEFAULT FALSE,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `expiresAt` DATETIME(3) NULL,
  `usageLimit` INTEGER NULL,
  `usedCount` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PromoCode_code_key` (`code`),
  INDEX `PromoCode_active_idx` (`active`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Auth refresh tokens (rotation + revocation)
CREATE TABLE IF NOT EXISTS `RefreshToken` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RefreshToken_tokenHash_key` (`tokenHash`),
  INDEX `RefreshToken_userId_idx` (`userId`),
  INDEX `RefreshToken_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
