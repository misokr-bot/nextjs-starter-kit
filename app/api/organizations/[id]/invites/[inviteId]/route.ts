import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { organizationInvite } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrganizationWithMembers } from "@/lib/organizations";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; inviteId: string } }
) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await getOrganizationWithMembers(params.id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user is an admin or owner
    const userMember = organization.members.find(
      member => member.userId === result.session.userId
    );

    if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden - Admin or owner required" }, { status: 403 });
    }

    // Get invite to check it exists
    const [invite] = await db.select()
      .from(organizationInvite)
      .where(and(
        eq(organizationInvite.id, params.inviteId),
        eq(organizationInvite.organizationId, params.id)
      ))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Delete invitation
    await db.delete(organizationInvite)
      .where(eq(organizationInvite.id, params.inviteId));

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.INVITE_REJECT,
      AUDIT_RESOURCES.ORGANIZATION_INVITE,
      params.inviteId,
      {
        organizationId: params.id,
        email: invite.email,
        role: invite.role
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
