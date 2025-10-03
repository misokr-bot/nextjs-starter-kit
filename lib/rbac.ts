export type UserRole = "user" | "admin" | "super_admin";
export type OrganizationRole = "owner" | "admin" | "member";

export interface UserContext {
  userId: string;
  role: UserRole;
  organizationId?: string;
  organizationRole?: OrganizationRole;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [
    { resource: "user", action: "read:own" },
    { resource: "user", action: "update:own" },
    { resource: "organization", action: "read:own" },
    { resource: "subscription", action: "read:own" },
    { resource: "apiKey", action: "read:own" },
    { resource: "apiKey", action: "create:own" },
    { resource: "apiKey", action: "update:own" },
    { resource: "apiKey", action: "delete:own" },
  ],
  admin: [
    { resource: "user", action: "read:all" },
    { resource: "user", action: "update:all" },
    { resource: "organization", action: "read:all" },
    { resource: "organization", action: "update:all" },
    { resource: "subscription", action: "read:all" },
    { resource: "subscription", action: "update:all" },
    { resource: "auditLog", action: "read:all" },
    { resource: "apiKey", action: "read:all" },
    { resource: "apiKey", action: "create:all" },
    { resource: "apiKey", action: "update:all" },
    { resource: "apiKey", action: "delete:all" },
  ],
  super_admin: [
    { resource: "*", action: "*" }, // All permissions
  ],
};

// Organization role permissions
export const ORGANIZATION_ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  member: [
    { resource: "organization", action: "read:own" },
    { resource: "organizationMember", action: "read:own" },
  ],
  admin: [
    { resource: "organization", action: "read:own" },
    { resource: "organization", action: "update:own" },
    { resource: "organizationMember", action: "read:own" },
    { resource: "organizationMember", action: "create:own" },
    { resource: "organizationMember", action: "update:own" },
    { resource: "organizationMember", action: "delete:own" },
    { resource: "organizationInvite", action: "create:own" },
    { resource: "organizationInvite", action: "read:own" },
    { resource: "organizationInvite", action: "delete:own" },
  ],
  owner: [
    { resource: "organization", action: "*" },
    { resource: "organizationMember", action: "*" },
    { resource: "organizationInvite", action: "*" },
    { resource: "subscription", action: "*" },
  ],
};

export function hasPermission(
  userContext: UserContext,
  resource: string,
  action: string,
  resourceId?: string
): boolean {
  // Super admin has all permissions
  if (userContext.role === "super_admin") {
    return true;
  }

  // Check user-level permissions
  const userPermissions = ROLE_PERMISSIONS[userContext.role] || [];
  const hasUserPermission = userPermissions.some(
    (permission) =>
      (permission.resource === resource || permission.resource === "*") &&
      (permission.action === action || permission.action === "*")
  );

  if (hasUserPermission) {
    return true;
  }

  // Check organization-level permissions if user is in an organization
  if (userContext.organizationId && userContext.organizationRole) {
    const orgPermissions = ORGANIZATION_ROLE_PERMISSIONS[userContext.organizationRole] || [];
    const hasOrgPermission = orgPermissions.some(
      (permission) =>
        (permission.resource === resource || permission.resource === "*") &&
        (permission.action === action || permission.action === "*")
    );

    if (hasOrgPermission) {
      return true;
    }
  }

  return false;
}

export function requirePermission(
  userContext: UserContext,
  resource: string,
  action: string,
  resourceId?: string
): void {
  if (!hasPermission(userContext, resource, action, resourceId)) {
    throw new Error(`Insufficient permissions: ${action} on ${resource}`);
  }
}

export function isAdmin(userContext: UserContext): boolean {
  return userContext.role === "admin" || userContext.role === "super_admin";
}

export function isSuperAdmin(userContext: UserContext): boolean {
  return userContext.role === "super_admin";
}

export function isOrganizationOwner(userContext: UserContext): boolean {
  return userContext.organizationRole === "owner";
}

export function isOrganizationAdmin(userContext: UserContext): boolean {
  return userContext.organizationRole === "admin" || userContext.organizationRole === "owner";
}

export function canManageOrganization(userContext: UserContext): boolean {
  return isOrganizationAdmin(userContext) || isAdmin(userContext);
}

export function canManageUsers(userContext: UserContext): boolean {
  return isAdmin(userContext);
}

export function canManageSubscriptions(userContext: UserContext): boolean {
  return isAdmin(userContext) || isOrganizationOwner(userContext);
}

export function canViewAuditLogs(userContext: UserContext): boolean {
  return isAdmin(userContext);
}

export function canManageApiKeys(userContext: UserContext, targetUserId?: string): boolean {
  // Super admin can manage all API keys
  if (isSuperAdmin(userContext)) {
    return true;
  }

  // Admin can manage all API keys
  if (isAdmin(userContext)) {
    return true;
  }

  // Users can manage their own API keys
  if (targetUserId && userContext.userId === targetUserId) {
    return true;
  }

  // Organization owners can manage organization API keys
  if (isOrganizationOwner(userContext)) {
    return true;
  }

  return false;
}
