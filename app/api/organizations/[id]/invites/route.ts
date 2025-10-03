import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { organizationInvite } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrganizationWithMembers } from "@/lib/organizations";
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

    const organization = await getOrganizationWithMembers(params.id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user is a member of this organization
    const isMember = organization.members.some(
      member => member.userId === result.session.userId
    );

    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get pending invitations
    const invites = await db.select()
      .from(organizationInvite)
      .where(and(
        eq(organizationInvite.organizationId, params.id),
        eq(organizationInvite.isAccepted, false)
      ));

    // Filter out expired invites
    const now = new Date();
    const validInvites = invites.filter(invite => invite.expiresAt > now);

    return NextResponse.json({ invites: validInvites });
  } catch (error) {
    console.error("Failed to get invitations:", error);
    return NextResponse.json(
      { error: "Failed to get invitations" },
      { status: 500 }
    );
  }
}
