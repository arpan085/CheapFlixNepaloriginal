-- Profile audit log (Postgres). Safe to run twice.
-- Apply with: psql $DATABASE_URL -f prisma/migrations_profile_audit.sql
-- or: prisma migrate dev --name profile-audit
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT,
  "actorRole" TEXT NOT NULL DEFAULT 'user',
  "targetUserId" TEXT NOT NULL,
  "targetName" TEXT,
  "action" TEXT NOT NULL,
  "changes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
