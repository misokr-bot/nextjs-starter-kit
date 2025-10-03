import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export interface ApiKeyContext {
  apiKeyId: string;
  userId: string;
  organizationId?: string;
  permissions: string[];
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyContext | null> {
  try {
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const key = authHeader.substring(7); // Remove "Bearer " prefix
    
    if (!key.startsWith("sk_")) {
      return null;
    }

    const apiKeyData = await validateApiKey(key);
    
    if (!apiKeyData) {
      return null;
    }

    // Log API key usage
    await logAuditEvent({
      userId: apiKeyData.userId,
      organizationId: apiKeyData.organizationId,
      action: AUDIT_ACTIONS.API_KEY_USE,
      resource: AUDIT_RESOURCES.API_KEY,
      resourceId: apiKeyData.id,
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    return {
      apiKeyId: apiKeyData.id,
      userId: apiKeyData.userId,
      organizationId: apiKeyData.organizationId,
      permissions: apiKeyData.permissions,
    };
  } catch (error) {
    console.error("API key authentication error:", error);
    return null;
  }
}

export function hasApiPermission(
  context: ApiKeyContext,
  resource: string,
  action: string
): boolean {
  // Check if API key has specific permission
  const permission = `${resource}:${action}`;
  const wildcardPermission = `${resource}:*`;
  const allPermission = "*:*";

  return (
    context.permissions.includes(permission) ||
    context.permissions.includes(wildcardPermission) ||
    context.permissions.includes(allPermission)
  );
}

export function requireApiPermission(
  context: ApiKeyContext,
  resource: string,
  action: string
): void {
  if (!hasApiPermission(context, resource, action)) {
    throw new Error(`Insufficient API permissions: ${action} on ${resource}`);
  }
}

export function getClientIp(req: NextRequest): string {
  return (
    req.ip ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function getRateLimitKey(apiKeyId: string, ip: string): string {
  return `rate_limit:${apiKeyId}:${ip}`;
}
