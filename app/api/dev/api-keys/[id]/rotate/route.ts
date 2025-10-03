import { NextRequest, NextResponse } from "next/server";
import { getApiKeyById, rotateApiKey } from "@/lib/api-keys";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requirePermission, getClientIp, getUserAgent } from "@/lib/middleware/auth";

async function POST(
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

      const result_rotate = await rotateApiKey(context.params.id);

      if (!result_rotate) {
        return NextResponse.json({ error: "Failed to rotate API key" }, { status: 500 });
      }

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.API_KEY_ROTATE,
        AUDIT_RESOURCES.API_KEY,
        result_rotate.apiKey.id,
        { name: result_rotate.apiKey.name },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json({
        key: result_rotate.key, // Only return the new key once during rotation
        apiKey: result_rotate.apiKey,
      });
    } catch (error) {
      console.error("Failed to rotate API key:", error);
      return NextResponse.json(
        { error: "Failed to rotate API key" },
        { status: 500 }
      );
    }
  })(req);
}

export { POST };
