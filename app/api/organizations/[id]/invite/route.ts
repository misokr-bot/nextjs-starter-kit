import { NextRequest, NextResponse } from "next/server";
import { getOrganizationWithMembers, inviteMember } from "@/lib/organizations";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requireOrganization, getClientIp, getUserAgent } from "@/lib/middleware/auth";

async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return requireOrganization(async (req, user, organizationId) => {
    try {
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

      const organization = await getOrganizationWithMembers(organizationId);

      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      // Check if user is an admin or owner of this organization
      const userMember = organization.members.find(
        member => member.userId === user.id
      );

      if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
        return NextResponse.json({ error: "Forbidden - Admin or owner required" }, { status: 403 });
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
        organizationId,
        email,
        role,
        invitedBy: user.id,
      });

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.INVITE_SEND,
        AUDIT_RESOURCES.ORGANIZATION_INVITE,
        invite.id,
        { email, role, organizationId },
        getClientIp(req),
        getUserAgent(req)
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
  })(req);
}

export { POST };
