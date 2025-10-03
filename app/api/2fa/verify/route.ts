import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { enableTwoFactor, verifyTwoFactorCode } from "@/lib/2fa";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, action } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (action === "enable") {
      // Enable 2FA
      const success = await enableTwoFactor(result.session.userId, token);

      if (!success) {
        return NextResponse.json({ error: "Invalid token" }, { status: 400 });
      }

      // Log the action
      await logUserAction(
        result.session.userId,
        AUDIT_ACTIONS.TWO_FA_ENABLE,
        AUDIT_RESOURCES.TWO_FA,
        undefined,
        { action: "enabled" }
      );

      return NextResponse.json({ success: true });
    } else {
      // Verify token for login
      const verification = await verifyTwoFactorCode(result.session.userId, token);

      if (!verification.isValid) {
        return NextResponse.json({ error: "Invalid token" }, { status: 400 });
      }

      // Log the action
      await logUserAction(
        result.session.userId,
        AUDIT_ACTIONS.TWO_FA_ENABLE,
        AUDIT_RESOURCES.TWO_FA,
        undefined,
        { action: "verified", backupCodeUsed: verification.backupCodeUsed }
      );

      return NextResponse.json({ 
        success: true,
        backupCodeUsed: verification.backupCodeUsed 
      });
    }
  } catch (error) {
    console.error("Failed to verify 2FA:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}
