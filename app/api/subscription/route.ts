import { getSubscriptionDetails } from "@/lib/subscription";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";

export const GET = requireAuth(async (req, user) => {
  try {
    const subscriptionDetails = await getSubscriptionDetails();
    return NextResponse.json(subscriptionDetails);
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
});