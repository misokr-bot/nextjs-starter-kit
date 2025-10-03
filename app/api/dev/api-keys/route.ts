import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getApiKeysByUser, createApiKey, CreateApiKeyData } from "@/lib/api-keys";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await getApiKeysByUser(result.session.userId);

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error("Failed to get API keys:", error);
    return NextResponse.json(
      { error: "Failed to get API keys" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, permissions, expiresAt } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const createData: CreateApiKeyData = {
      name,
      userId: result.session.userId,
      permissions: permissions || [],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };

    const { key, apiKey } = await createApiKey(createData);

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.API_KEY_CREATE,
      AUDIT_RESOURCES.API_KEY,
      apiKey.id,
      { name: apiKey.name, permissions: apiKey.permissions }
    );

    return NextResponse.json({ 
      key, // Only return the key once during creation
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
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
}
