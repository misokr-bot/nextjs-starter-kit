import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { user, organization, apiKey, twoFactorAuth } from "@/db/schema";
import { count, gte, sql, and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/middleware/auth";

export const GET = requireAuth(async (req: NextRequest, authenticatedUser) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Total Users
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(user);

    // New Users This Month
    const [newUsersThisMonthResult] = await db
      .select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, startOfMonth));

    // New Users Last Month (for comparison)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const [newUsersLastMonthResult] = await db
      .select({ count: count() })
      .from(user)
      .where(
        and(
          gte(user.createdAt, lastMonthStart),
          sql`${user.createdAt} < ${lastMonthEnd}`
        )
      );

    // Active Organizations
    const [activeOrganizationsResult] = await db
      .select({ count: count() })
      .from(organization)
      .where(eq(organization.isActive, true));

    // Total Organizations (for growth rate)
    const [totalOrganizationsResult] = await db
      .select({ count: count() })
      .from(organization);

    // Active API Keys
    const [activeApiKeysResult] = await db
      .select({ count: count() })
      .from(apiKey)
      .where(eq(apiKey.isActive, true));

    // 2FA Enabled Users
    const [twoFactorEnabledResult] = await db
      .select({ count: count() })
      .from(twoFactorAuth)
      .where(eq(twoFactorAuth.isEnabled, true));

    // User Growth Chart Data (last 90 days)
    const userGrowthData = await db
      .select({
        date: sql<string>`DATE(${user.createdAt})`.as("date"),
        count: count(),
      })
      .from(user)
      .where(gte(user.createdAt, ninetyDaysAgo))
      .groupBy(sql`DATE(${user.createdAt})`)
      .orderBy(sql`DATE(${user.createdAt})`);

    // Calculate percentage changes
    const newUsersThisMonth = newUsersThisMonthResult?.count || 0;
    const newUsersLastMonth = newUsersLastMonthResult?.count || 0;
    const userGrowthPercentage =
      newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : 0;

    const totalUsers = totalUsersResult?.count || 0;
    const activeOrganizations = activeOrganizationsResult?.count || 0;
    const totalOrganizations = totalOrganizationsResult?.count || 0;
    const orgGrowthPercentage =
      totalOrganizations > 0
        ? (activeOrganizations / totalOrganizations) * 100
        : 0;

    return NextResponse.json({
      stats: {
        totalUsers,
        newUsersThisMonth,
        userGrowthPercentage: parseFloat(userGrowthPercentage.toFixed(1)),
        activeOrganizations,
        orgGrowthPercentage: parseFloat(orgGrowthPercentage.toFixed(1)),
        activeApiKeys: activeApiKeysResult?.count || 0,
        twoFactorEnabled: twoFactorEnabledResult?.count || 0,
      },
      chartData: userGrowthData.map((item) => ({
        date: item.date,
        users: item.count,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
});
