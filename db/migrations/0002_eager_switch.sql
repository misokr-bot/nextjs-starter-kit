ALTER TABLE "user" ADD COLUMN "loginAttempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lastFailedAttempt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lockedUntil" timestamp;