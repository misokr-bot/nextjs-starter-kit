import { ReactNode } from "react";
import DashboardTopNav from "./_components/navbar";
import DashboardSideBar from "./_components/sidebar";
import Chatbot from "./_components/chatbot";
import { OrganizationProvider } from "@/contexts/organization-context";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OrganizationProvider>
      <div className="flex h-screen overflow-hidden w-full">
        <DashboardSideBar />
        <main className="flex-1 overflow-y-auto">
          <DashboardTopNav>{children}</DashboardTopNav>
        </main>
        <Chatbot />
      </div>
    </OrganizationProvider>
  );
}
