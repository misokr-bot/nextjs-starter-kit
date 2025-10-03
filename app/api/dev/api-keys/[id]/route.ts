import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getApiKeyById, updateApiKey, deleteApiKey, rotateApiKey } from "@/lib/api-keys";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function GET(
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

    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error("Failed to get API key:", error);
    return NextResponse.json(
      { error: "Failed to get API key" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await req.json();
    const { name, permissions, isActive, expiresAt } = body;

    const apiKey = await getApiKeyById(params.id);

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Check if user owns this API key
    if (apiKey.userId !== result.session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (permissions !== undefined) updates.permissions = permissions;
    if (isActive !== undefined) updates.isActive = isActive;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updatedApiKey = await updateApiKey(params.id, updates);

    if (!updatedApiKey) {
      return NextResponse.json({ error: "Failed to update API key" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.API_KEY_UPDATE,
      AUDIT_RESOURCES.API_KEY,
      updatedApiKey.id,
      { updates }
    );

    return NextResponse.json({ apiKey: updatedApiKey });
  } catch (error) {
    console.error("Failed to update API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const success = await deleteApiKey(params.id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.API_KEY_DELETE,
      AUDIT_RESOURCES.API_KEY,
      params.id,
      { name: apiKey.name }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
