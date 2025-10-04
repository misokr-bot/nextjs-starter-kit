import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isAdmin } from "@/lib/rbac";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  // Check if user is admin
  if (!isAdmin({ userId: result.session.userId, role: result.session.user.role as any })) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Admin Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>
          </div>
          <nav className="mt-6">
            <a
              href="/admin/dashboard"
              className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              개요
            </a>
            <a
              href="/admin/users"
              className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              사용자 관리
            </a>
            <a
              href="/admin/organizations"
              className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              조직 관리
            </a>
            <a
              href="/admin/subscriptions"
              className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              구독 관리
            </a>
            <a
              href="/admin/audit-logs"
              className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              감사 로그
            </a>
            <a
              href="/admin/api-keys"
              className="block px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              API 키 관리
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
