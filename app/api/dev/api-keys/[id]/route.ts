import { NextRequest, NextResponse } from "next/server";
import { getApiKeyById, updateApiKey, deleteApiKey } from "@/lib/api-keys";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requirePermission, getClientIp, getUserAgent } from "@/lib/middleware/auth";

async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return requirePermission("apiKey", "read:own", async (req, user) => {
    try {
      const apiKey = await getApiKeyById(context.params.id);

      if (!apiKey) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }

      // Check if user owns this API key or is an admin
      if (apiKey.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
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
  })(req);
}

export { GET };

async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return requirePermission("apiKey", "update:own", async (req, user) => {
    try {
      const apiKey = await getApiKeyById(context.params.id);

      if (!apiKey) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }

      // Check if user owns this API key
      if (apiKey.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = await req.json();
      const { name, permissions, isActive, expiresAt } = body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (permissions !== undefined) updates.permissions = permissions;
      if (isActive !== undefined) updates.isActive = isActive;
      if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

      const updatedApiKey = await updateApiKey(context.params.id, updates);

      if (!updatedApiKey) {
        return NextResponse.json({ error: "Failed to update API key" }, { status: 500 });
      }

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.API_KEY_UPDATE,
        AUDIT_RESOURCES.API_KEY,
        updatedApiKey.id,
        { updates },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json({ apiKey: updatedApiKey });
    } catch (error) {
      console.error("Failed to update API key:", error);
      return NextResponse.json(
        { error: "Failed to update API key" },
        { status: 500 }
      );
    }
  })(req);
}

export { PUT };

async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return requirePermission("apiKey", "delete:own", async (req, user) => {
    try {
      const apiKey = await getApiKeyById(context.params.id);

      if (!apiKey) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }

      // Check if user owns this API key
      if (apiKey.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const success = await deleteApiKey(context.params.id);

      if (!success) {
        return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
      }

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.API_KEY_DELETE,
        AUDIT_RESOURCES.API_KEY,
        context.params.id,
        { name: apiKey.name, permissions: apiKey.permissions },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to delete API key:", error);
      return NextResponse.json(
        { error: "Failed to delete API key" },
        { status: 500 }
      );
    }
  })(req);
}

export { DELETE };
