import { NextRequest, NextResponse } from "next/server";
import { getOrganizationWithMembers, updateOrganization, deleteOrganization } from "@/lib/organizations";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requireOrganization, getClientIp, getUserAgent } from "@/lib/middleware/auth";

async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return requireOrganization(async (req, user, organizationId) => {
    try {
      const organization = await getOrganizationWithMembers(organizationId);

      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      return NextResponse.json({ organization });
    } catch (error) {
      console.error("Failed to get organization:", error);
      return NextResponse.json(
        { error: "Failed to get organization" },
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
  return requireOrganization(async (req, user, organizationId) => {
    try {
      const body = await req.json();
      const { name, slug, description, website, logo } = body;

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

      const success = await updateOrganization(organizationId, {
        name,
        slug,
        description,
        website,
        logo,
      });

      if (!success) {
        return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
      }

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.ORGANIZATION_UPDATE,
        AUDIT_RESOURCES.ORGANIZATION,
        organizationId,
        { updates: { name, slug, description, website, logo } },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to update organization:", error);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }
  })(req);
}

async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return requireOrganization(async (req, user, organizationId) => {
    try {
      const organization = await getOrganizationWithMembers(organizationId);

      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      // Check if user is the owner of this organization
      const userMember = organization.members.find(
        member => member.userId === user.id
      );

      if (!userMember || userMember.role !== "owner") {
        return NextResponse.json({ error: "Forbidden - Owner required" }, { status: 403 });
      }

      const success = await deleteOrganization(organizationId);

      if (!success) {
        return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
      }

      // Log the action
      await logUserAction(
        user.id,
        AUDIT_ACTIONS.ORGANIZATION_DELETE,
        AUDIT_RESOURCES.ORGANIZATION,
        organizationId,
        { name: organization.name },
        getClientIp(req),
        getUserAgent(req)
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to delete organization:", error);
      return NextResponse.json(
        { error: "Failed to delete organization" },
        { status: 500 }
      );
    }
  })(req);
}

export { PUT, DELETE };
