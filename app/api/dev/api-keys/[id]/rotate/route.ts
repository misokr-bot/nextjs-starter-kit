import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getApiKeyById, rotateApiKey } from "@/lib/api-keys";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = await getApiKeyById(params.id);

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Check if user owns this API key
    if (apiKey.userId !== result.session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result_rotate = await rotateApiKey(params.id);

    if (!result_rotate) {
      return NextResponse.json({ error: "Failed to rotate API key" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.API_KEY_ROTATE,
      AUDIT_RESOURCES.API_KEY,
      result_rotate.apiKey.id,
      { name: result_rotate.apiKey.name }
    );

    return NextResponse.json({ 
      key: result_rotate.key, // Only return the new key once during rotation
      apiKey: {
        id: result_rotate.apiKey.id,
        name: result_rotate.apiKey.name,
        permissions: result_rotate.apiKey.permissions,
        lastUsedAt: result_rotate.apiKey.lastUsedAt,
        expiresAt: result_rotate.apiKey.expiresAt,
        isActive: result_rotate.apiKey.isActive,
        createdAt: result_rotate.apiKey.createdAt,
        updatedAt: result_rotate.apiKey.updatedAt,
      }
    });
  } catch (error) {
    console.error("Failed to rotate API key:", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}
