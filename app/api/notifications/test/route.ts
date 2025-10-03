import { NextRequest, NextResponse } from "next/server";
import {
  sendWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionRenewalEmail,
  sendSecurityAlertEmail
} from "@/lib/notifications/email";
import { requireAuth } from "@/lib/middleware/auth";

export const POST = requireAuth(async (req, user) => {
  try {
    const { type, email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    let result;

    switch (type) {
      case "welcome":
        result = await sendWelcomeEmail({
          name: "테스트 사용자",
          email: email,
        });
        break;

      case "payment-failed":
        result = await sendPaymentFailedEmail({
          name: "테스트 사용자",
          email: email,
          amount: 99,
          currency: "USD",
          retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        });
        break;

      case "subscription-renewal":
        result = await sendSubscriptionRenewalEmail({
          name: "테스트 사용자",
          email: email,
          planName: "Starter Plan",
          amount: 99,
          currency: "USD",
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR'),
        });
        break;

      case "security-alert":
        result = await sendSecurityAlertEmail({
          name: "테스트 사용자",
          email: email,
          action: "새로운 기기에서 로그인",
          timestamp: new Date().toLocaleString('ko-KR'),
          ipAddress: "192.168.1.1",
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${type} email sent successfully`,
      data: result
    });

  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
});
