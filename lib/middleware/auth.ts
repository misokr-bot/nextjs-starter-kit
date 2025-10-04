import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasPermission, UserContext } from "@/lib/rbac";
import { db } from "@/db/drizzle";
import { organizationMember } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId?: string;
    organizationRole?: string;
  };
}

/**
 * Get authenticated user from session
 */
export async function getAuthenticatedUser() {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId || !result?.user) {
      return null;
    }

    return {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role || "user",
    };
  } catch (error) {
    console.error("Failed to get authenticated user:", error);
    return null;
  }
}

/**
 * Get user context with organization information
 */
export async function getUserContext(
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>,
  organizationId?: string
): Promise<UserContext | null> {
  try {
    const userContext: UserContext = {
      userId: user.id,
      role: (user.role as "user" | "admin" | "super_admin") || "user",
    };

    // If organizationId is provided, get user's role in that organization
    if (organizationId) {
      const membership = await db
        .select({
          role: organizationMember.role,
        })
        .from(organizationMember)
        .where(eq(organizationMember.userId, user.id))
        .limit(1);

      if (membership.length > 0) {
        userContext.organizationId = organizationId;
        userContext.organizationRole = membership[0].role as
          | "owner"
          | "admin"
          | "member";
      }
    }

    return userContext;
  } catch (error) {
    console.error("Failed to get user context:", error);
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  handler: (
    req: NextRequest,
    user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
  ) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    return handler(req, user);
  };
}

/**
 * Middleware to require specific role
 */
export async function requireRole(
  role: "user" | "admin" | "super_admin",
  handler: (
    req: NextRequest,
    user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
  ) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const userContext: UserContext = {
      userId: user.id,
      role: user.role as "user" | "admin" | "super_admin",
    };

    // Check role hierarchy: super_admin > admin > user
    const roleHierarchy = {
      super_admin: 3,
      admin: 2,
      user: 1,
    };

    const requiredLevel = roleHierarchy[role];
    const userLevel = roleHierarchy[userContext.role];

    if (userLevel < requiredLevel) {
      return NextResponse.json(
        {
          error: "Forbidden - Insufficient permissions",
          required: role,
          current: userContext.role,
        },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}

/**
 * Middleware to require specific permission
 */
export async function requirePermission(
  resource: string,
  action: string,
  handler: (
    req: NextRequest,
    user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>,
    userContext: UserContext
  ) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    // Get organization ID from query params or body
    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organizationId") || undefined;

    const userContext = await getUserContext(user, organizationId);

    if (!userContext) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid user context" },
        { status: 401 }
      );
    }

    // Check permission
    const hasAccess = hasPermission(userContext, resource, action);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Forbidden - Insufficient permissions",
          required: `${action} on ${resource}`,
        },
        { status: 403 }
      );
    }

    return handler(req, user, userContext);
  };
}

/**
 * Middleware to require organization membership
 */
export async function requireOrganization(
  handler: (
    req: NextRequest,
    user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>,
    organizationId: string
  ) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    // Get organization ID from URL or body
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orgIdFromPath = pathParts[pathParts.indexOf("organizations") + 1];

    let organizationId = orgIdFromPath;

    // If not in path, try to get from query params
    if (!organizationId) {
      organizationId = url.searchParams.get("organizationId") || "";
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Bad Request - Organization ID required" },
        { status: 400 }
      );
    }

    // Check if user is a member of the organization
    const membership = await db
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.userId, user.id))
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json(
        { error: "Forbidden - Not a member of this organization" },
        { status: 403 }
      );
    }

    return handler(req, user, organizationId);
  };
}

/**
 * Extract IP address from request
 */
export function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

/**
 * Extract User-Agent from request
 */
export function getUserAgent(req: NextRequest): string | undefined {
  return req.headers.get("user-agent") || undefined;
}
