import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateTwoFactorSecret } from "@/lib/2fa";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setup = await generateTwoFactorSecret(
      result.session.userId,
      result.session.user.email
    );

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.TWO_FA_ENABLE,
      AUDIT_RESOURCES.TWO_FA,
      undefined,
      { action: "setup_initiated" }
    );

    return NextResponse.json({ setup });
  } catch (error) {
    console.error("Failed to setup 2FA:", error);
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
