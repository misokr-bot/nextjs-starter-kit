import { NextRequest, NextResponse } from "next/server";
import { disableTwoFactor } from "@/lib/2fa";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requireAuth, getClientIp, getUserAgent } from "@/lib/middleware/auth";

export const POST = requireAuth(async (req, user) => {
  try {
    const success = await disableTwoFactor(user.id);

    if (!success) {
      return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      user.id,
      AUDIT_ACTIONS.TWO_FA_DISABLE,
      AUDIT_RESOURCES.TWO_FA,
      undefined,
      { action: "disabled" },
      getClientIp(req),
      getUserAgent(req)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disable 2FA:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
});
