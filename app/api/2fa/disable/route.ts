import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { disableTwoFactor } from "@/lib/2fa";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await disableTwoFactor(result.session.userId);

    if (!success) {
      return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.TWO_FA_DISABLE,
      AUDIT_RESOURCES.TWO_FA,
      undefined,
      { action: "disabled" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disable 2FA:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
