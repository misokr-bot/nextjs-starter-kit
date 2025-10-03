import { NextRequest, NextResponse } from "next/server";
import { getApiKeysByUser, createApiKey, CreateApiKeyData } from "@/lib/api-keys";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requirePermission, getClientIp, getUserAgent } from "@/lib/middleware/auth";

export const GET = requirePermission("apiKey", "read:own", async (req, user, userContext) => {
  try {
    const apiKeys = await getApiKeysByUser(user.id);

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error("Failed to get API keys:", error);
    return NextResponse.json(
      { error: "Failed to get API keys" },
      { status: 500 }
    );
  }
});

export const POST = requirePermission("apiKey", "create:own", async (req, user, userContext) => {
  try {
    const body = await req.json();
    const { name, permissions, expiresAt, organizationId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const createData: CreateApiKeyData = {
      name,
      userId: user.id,
      organizationId: organizationId || userContext.organizationId,
      permissions: permissions || [],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };

    const { key, apiKey } = await createApiKey(createData);

    // Log the action
    await logUserAction(
      user.id,
      AUDIT_ACTIONS.API_KEY_CREATE,
      AUDIT_RESOURCES.API_KEY,
      apiKey.id,
      {
        name: apiKey.name,
        permissions: apiKey.permissions,
        organizationId: apiKey.organizationId,
      },
      getClientIp(req),
      getUserAgent(req)
    );

    return NextResponse.json({
      key, // Only return the key once during creation
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        organizationId: apiKey.organizationId,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      }
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
});
