import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/drizzle";
import { user, organization, subscription, auditLog } from "@/db/schema";
import { count, eq, gte, sql } from "drizzle-orm";

export default async function AdminDashboard() {
  // Get statistics
  const [
    totalUsers,
    activeUsers,
    totalOrganizations,
    activeSubscriptions,
    recentActivity,
  ] = await Promise.all([
    // Total users
    db.select({ count: count() }).from(user),
    
    // Active users (last 30 days)
    db.select({ count: count() }).from(user).where(
      gte(user.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    ),
    
    // Total organizations
    db.select({ count: count() }).from(organization),
    
    // Active subscriptions
    db.select({ count: count() }).from(subscription).where(
      eq(subscription.status, "active")
    ),
    
    // Recent activity (last 10 audit logs)
    db.select({
      id: auditLog.id,
      action: auditLog.action,
      resource: auditLog.resource,
      createdAt: auditLog.createdAt,
      userId: auditLog.userId,
    })
    .from(auditLog)
    .orderBy(sql`${auditLog.createdAt} DESC`)
    .limit(10),
  ]);

  const stats = [
    {
      title: "총 사용자",
      value: totalUsers[0]?.count || 0,
      description: "등록된 모든 사용자",
    },
    {
      title: "활성 사용자 (30일)",
      value: activeUsers[0]?.count || 0,
      description: "최근 30일 내 활동한 사용자",
    },
    {
      title: "총 조직",
      value: totalOrganizations[0]?.count || 0,
      description: "등록된 모든 조직",
    },
    {
      title: "활성 구독",
      value: activeSubscriptions[0]?.count || 0,
      description: "현재 활성 상태인 구독",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-600">시스템 전체 현황을 확인하세요</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>
            시스템에서 발생한 최근 활동들을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">최근 활동이 없습니다</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.action} - {activity.resource}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.createdAt?.toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {activity.userId ? `사용자: ${activity.userId.slice(0, 8)}...` : '시스템'}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
