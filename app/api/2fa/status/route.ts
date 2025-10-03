import { NextRequest, NextResponse } from "next/server";
import { getTwoFactorStatus } from "@/lib/2fa";
import { requireAuth } from "@/lib/middleware/auth";

export const GET = requireAuth(async (req, user) => {
  try {
    const status = await getTwoFactorStatus(user.id);

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Failed to get 2FA status:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
});
