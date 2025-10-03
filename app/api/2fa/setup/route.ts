import { NextRequest, NextResponse } from "next/server";
import { generateTwoFactorSecret } from "@/lib/2fa";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requireAuth, getClientIp, getUserAgent } from "@/lib/middleware/auth";

export const POST = requireAuth(async (req, user) => {
  try {
    const setup = await generateTwoFactorSecret(
      user.id,
      user.email
    );

    // Log the action
    await logUserAction(
      user.id,
      AUDIT_ACTIONS.TWO_FA_SETUP,
      AUDIT_RESOURCES.TWO_FA,
      undefined,
      { action: "setup_initiated" },
      getClientIp(req),
      getUserAgent(req)
    );

    return NextResponse.json({ setup });
  } catch (error) {
    console.error("Failed to setup 2FA:", error);
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
});
