"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  description?: string;
  website?: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          setCurrentOrganization(current);
          localStorage.setItem("currentOrganizationId", current.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();

    // Listen for organization changes
    const handleOrgChange = (event: CustomEvent) => {
      setCurrentOrganization(event.detail);
    };

    window.addEventListener("organizationChanged" as any, handleOrgChange);
    return () => {
      window.removeEventListener("organizationChanged" as any, handleOrgChange);
    };
  }, []);

  const switchOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    localStorage.setItem("currentOrganizationId", org.id);
    window.dispatchEvent(new CustomEvent("organizationChanged", { detail: org }));
  };

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        isLoading,
        switchOrganization,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}
