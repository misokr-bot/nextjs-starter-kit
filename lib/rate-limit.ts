import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  lockoutDurationMs: number; // Lockout duration after max attempts
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  isLocked: boolean;
  lockedUntil?: Date;
  resetAt: Date;
}

// Default configuration for 2FA verification
export const TWO_FA_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes lockout
};

// More strict configuration for account lockout after persistent failures
export const ACCOUNT_LOCKOUT_CONFIG: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour window
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes lockout
};

/**
 * Check if a user is currently locked out
 */
export async function isUserLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
}> {
  const userRecord = await db
    .select({
      lockedUntil: user.lockedUntil,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (userRecord.length === 0) {
    return { locked: false };
  }

  const lockedUntil = userRecord[0].lockedUntil;

  if (!lockedUntil) {
    return { locked: false };
  }

  const now = new Date();
  if (lockedUntil > now) {
    return { locked: true, lockedUntil };
  }

  // Lockout expired, clear it
  await db
    .update(user)
    .set({
      lockedUntil: null,
      loginAttempts: 0,
      lastFailedAttempt: null,
    })
    .where(eq(user.id, userId));

  return { locked: false };
}

/**
 * Check rate limit for a user action
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = TWO_FA_RATE_LIMIT
): Promise<RateLimitResult> {
  // First check if user is locked
  const lockStatus = await isUserLocked(userId);
  if (lockStatus.locked) {
    const resetAt = lockStatus.lockedUntil || new Date();
    return {
      allowed: false,
      remaining: 0,
      isLocked: true,
      lockedUntil: lockStatus.lockedUntil,
      resetAt,
    };
  }

  const userRecord = await db
    .select({
      loginAttempts: user.loginAttempts,
      lastFailedAttempt: user.lastFailedAttempt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (userRecord.length === 0) {
    throw new Error("User not found");
  }

  const { loginAttempts = 0, lastFailedAttempt } = userRecord[0];

  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // If last attempt was outside the window, reset
  if (!lastFailedAttempt || lastFailedAttempt < windowStart) {
    await db
      .update(user)
      .set({
        loginAttempts: 0,
        lastFailedAttempt: null,
      })
      .where(eq(user.id, userId));

    return {
      allowed: true,
      remaining: config.maxAttempts,
      isLocked: false,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }

  // Check if attempts exceeded
  const remaining = config.maxAttempts - loginAttempts;

  if (remaining <= 0) {
    // Lock the account
    const lockedUntil = new Date(now.getTime() + config.lockoutDurationMs);
    await db
      .update(user)
      .set({
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(user.id, userId));

    return {
      allowed: false,
      remaining: 0,
      isLocked: true,
      lockedUntil,
      resetAt: lockedUntil,
    };
  }

  return {
    allowed: true,
    remaining,
    isLocked: false,
    resetAt: new Date(lastFailedAttempt.getTime() + config.windowMs),
  };
}

/**
 * Record a failed attempt
 */
export async function recordFailedAttempt(
  userId: string,
  config: RateLimitConfig = TWO_FA_RATE_LIMIT
): Promise<RateLimitResult> {
  const now = new Date();

  const userRecord = await db
    .select({
      loginAttempts: user.loginAttempts,
      lastFailedAttempt: user.lastFailedAttempt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (userRecord.length === 0) {
    throw new Error("User not found");
  }

  const { loginAttempts = 0, lastFailedAttempt } = userRecord[0];
  const windowStart = new Date(now.getTime() - config.windowMs);

  // If last attempt was outside the window, reset and start new count
  let newAttempts = loginAttempts + 1;
  if (!lastFailedAttempt || lastFailedAttempt < windowStart) {
    newAttempts = 1;
  }

  // Check if this attempt triggers a lockout
  if (newAttempts >= config.maxAttempts) {
    const lockedUntil = new Date(now.getTime() + config.lockoutDurationMs);
    await db
      .update(user)
      .set({
        loginAttempts: newAttempts,
        lastFailedAttempt: now,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(user.id, userId));

    return {
      allowed: false,
      remaining: 0,
      isLocked: true,
      lockedUntil,
      resetAt: lockedUntil,
    };
  }

  // Record the failed attempt
  await db
    .update(user)
    .set({
      loginAttempts: newAttempts,
      lastFailedAttempt: now,
      updatedAt: now,
    })
    .where(eq(user.id, userId));

  return {
    allowed: true,
    remaining: config.maxAttempts - newAttempts,
    isLocked: false,
    resetAt: new Date(now.getTime() + config.windowMs),
  };
}

/**
 * Reset attempts after successful verification
 */
export async function resetAttempts(userId: string): Promise<void> {
  await db
    .update(user)
    .set({
      loginAttempts: 0,
      lastFailedAttempt: null,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

/**
 * Get formatted error message for rate limit response
 */
export function getRateLimitErrorMessage(result: RateLimitResult): string {
  if (result.isLocked && result.lockedUntil) {
    const minutes = Math.ceil(
      (result.lockedUntil.getTime() - Date.now()) / (60 * 1000)
    );
    return `Account locked due to too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`;
  }

  if (result.remaining === 0) {
    return "Too many failed attempts. Please try again later.";
  }

  return `Invalid code. ${result.remaining} attempt${result.remaining !== 1 ? "s" : ""} remaining before account lockout.`;
}
