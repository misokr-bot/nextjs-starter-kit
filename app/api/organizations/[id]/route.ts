import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrganizationWithMembers, updateOrganization, deleteOrganization } from "@/lib/organizations";
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

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Failed to get organization:", error);
    return NextResponse.json(
      { error: "Failed to get organization" },
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
    const { name, slug, description, website, logo } = body;

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

    const success = await updateOrganization(params.id, {
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
      result.session.userId,
      AUDIT_ACTIONS.ORGANIZATION_UPDATE,
      AUDIT_RESOURCES.ORGANIZATION,
      params.id,
      { updates: { name, slug, description, website, logo } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
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

    const organization = await getOrganizationWithMembers(params.id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user is the owner of this organization
    const userMember = organization.members.find(
      member => member.userId === result.session.userId
    );

    if (!userMember || userMember.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const success = await deleteOrganization(params.id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.ORGANIZATION_DELETE,
      AUDIT_RESOURCES.ORGANIZATION,
      params.id,
      { name: organization.name }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete organization:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
