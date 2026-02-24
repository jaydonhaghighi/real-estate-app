BEGIN;

ALTER TABLE "User" ADD COLUMN clerk_id TEXT UNIQUE;

CREATE INDEX idx_user_clerk_id ON "User"(clerk_id) WHERE clerk_id IS NOT NULL;

COMMIT;
