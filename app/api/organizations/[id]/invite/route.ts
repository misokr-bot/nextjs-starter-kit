import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrganizationWithMembers, inviteMember } from "@/lib/organizations";
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

    const body = await req.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ 
        error: "Email and role are required" 
      }, { status: 400 });
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ 
        error: "Role must be 'admin' or 'member'" 
      }, { status: 400 });
    }

    const organization = await getOrganizationWithMembers(params.id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user is an admin or owner of this organization
    const userMember = organization.members.find(
      member => member.userId === result.session.userId
    );

    if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user is already a member
    const isAlreadyMember = organization.members.some(
      member => member.user.email === email
    );

    if (isAlreadyMember) {
      return NextResponse.json({ 
        error: "User is already a member of this organization" 
      }, { status: 400 });
    }

    const { invite, emailSent } = await inviteMember({
      organizationId: params.id,
      email,
      role,
      invitedBy: result.session.userId,
    });

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.INVITE_SEND,
      AUDIT_RESOURCES.ORGANIZATION_INVITE,
      invite.id,
      { email, role, organizationId: params.id }
    );

    return NextResponse.json({ 
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        isAccepted: invite.isAccepted,
        createdAt: invite.createdAt,
      },
      emailSent 
    });
  } catch (error) {
    console.error("Failed to invite member:", error);
    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    );
  }
}
