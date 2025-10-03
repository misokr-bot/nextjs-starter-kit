"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string; // owner, admin, member
}

export function OrganizationSwitcher() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        const orgs = data.organizations || [];
        setOrganizations(orgs);

        // Set current org from localStorage or first org
        const savedOrgId = localStorage.getItem("currentOrganizationId");
        const current = savedOrgId
          ? orgs.find((o: Organization) => o.id === savedOrgId)
          : orgs[0];

        if (current) {
          setCurrentOrg(current);
          localStorage.setItem("currentOrganizationId", current.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem("currentOrganizationId", org.id);
    toast.success(`조직이 ${org.name}(으)로 전환되었습니다`);

    // Trigger a page refresh or state update
    window.dispatchEvent(new CustomEvent("organizationChanged", { detail: org }));
  };

  const createOrganization = () => {
    router.push("/dashboard/settings/organization?tab=create");
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Building2 className="mr-2 h-4 w-4" />
        로딩 중...
      </Button>
    );
  }

  if (organizations.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={createOrganization}>
        <Plus className="mr-2 h-4 w-4" />
        조직 생성
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-[200px] justify-between"
        >
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">
              {currentOrg?.name || "조직 선택"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>내 조직</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{org.name}</span>
                <span className="text-xs text-muted-foreground">
                  {org.role === "owner" && "소유자"}
                  {org.role === "admin" && "관리자"}
                  {org.role === "member" && "멤버"}
                </span>
              </div>
              {currentOrg?.id === org.id && (
                <Check className="h-4 w-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={createOrganization} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          새 조직 생성
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook to get current organization
export function useCurrentOrganization() {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const fetchCurrentOrg = async () => {
      const orgId = localStorage.getItem("currentOrganizationId");
      if (!orgId) return;

      try {
        const response = await fetch(`/api/organizations/${orgId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentOrg(data.organization);
        }
      } catch (error) {
        console.error("Failed to fetch current organization:", error);
      }
    };

    fetchCurrentOrg();

    // Listen for organization changes
    const handleOrgChange = (event: CustomEvent) => {
      setCurrentOrg(event.detail);
    };

    window.addEventListener("organizationChanged" as any, handleOrgChange);
    return () => {
      window.removeEventListener("organizationChanged" as any, handleOrgChange);
    };
  }, []);

  return currentOrg;
}
