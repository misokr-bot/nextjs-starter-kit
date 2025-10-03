import { NextRequest, NextResponse } from "next/server";
import { enableTwoFactor, verifyTwoFactorCode } from "@/lib/2fa";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requireAuth, getClientIp, getUserAgent } from "@/lib/middleware/auth";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  getRateLimitErrorMessage,
  TWO_FA_RATE_LIMIT,
} from "@/lib/rate-limit";

export const POST = requireAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { token, action } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(
      user.id,
      TWO_FA_RATE_LIMIT
    );

    if (!rateLimitResult.allowed) {
      // Log failed attempt due to rate limit
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.TWO_FA_VERIFY,
        AUDIT_RESOURCES.TWO_FA,
        undefined,
        {
          action: "rate_limited",
          locked: rateLimitResult.isLocked,
          lockedUntil: rateLimitResult.lockedUntil?.toISOString(),
        },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json(
        {
          error: getRateLimitErrorMessage(rateLimitResult),
          locked: rateLimitResult.isLocked,
          lockedUntil: rateLimitResult.lockedUntil,
          remaining: rateLimitResult.remaining,
        },
        { status: 429 }
      );
    }

    if (action === "enable") {
      // Enable 2FA
      const success = await enableTwoFactor(user.id, token);

      if (!success) {
        // Record failed attempt
        const failedResult = await recordFailedAttempt(
          user.id,
          TWO_FA_RATE_LIMIT
        );

        // Log failed attempt
        await logUserAction(
          user.id,
          AUDIT_ACTIONS.TWO_FA_ENABLE,
          AUDIT_RESOURCES.TWO_FA,
          undefined,
          {
            action: "failed",
            remaining: failedResult.remaining,
            locked: failedResult.isLocked,
          },
          getClientIp(req),
          getUserAgent(req)
        );

        return NextResponse.json(
          {
            error: getRateLimitErrorMessage(failedResult),
            remaining: failedResult.remaining,
            locked: failedResult.isLocked,
            lockedUntil: failedResult.lockedUntil,
          },
          { status: 400 }
        );
      }

      // Reset attempts on success
      await resetAttempts(user.id);

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.TWO_FA_ENABLE,
        AUDIT_RESOURCES.TWO_FA,
        undefined,
        { action: "enabled" },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json({ success: true });
    } else {
      // Verify token for login
      const verification = await verifyTwoFactorCode(
        user.id,
        token
      );

      if (!verification.isValid) {
        // Record failed attempt
        const failedResult = await recordFailedAttempt(
          user.id,
          TWO_FA_RATE_LIMIT
        );

        // Log failed attempt
        await logUserAction(
          user.id,
          AUDIT_ACTIONS.TWO_FA_VERIFY,
          AUDIT_RESOURCES.TWO_FA,
          undefined,
          {
            action: "failed",
            remaining: failedResult.remaining,
            locked: failedResult.isLocked,
          },
          getClientIp(req),
          getUserAgent(req)
        );

        return NextResponse.json(
          {
            error: getRateLimitErrorMessage(failedResult),
            remaining: failedResult.remaining,
            locked: failedResult.isLocked,
            lockedUntil: failedResult.lockedUntil,
          },
          { status: 400 }
        );
      }

      // Reset attempts on success
      await resetAttempts(user.id);

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.TWO_FA_VERIFY,
        AUDIT_RESOURCES.TWO_FA,
        undefined,
        { action: "verified", backupCodeUsed: verification.backupCodeUsed },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json({
        success: true,
        backupCodeUsed: verification.backupCodeUsed,
      });
    }
  } catch (error) {
    console.error("Failed to verify 2FA:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
});
