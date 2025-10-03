import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrganizationWithMembers, updateMemberRole, removeMember } from "@/lib/organizations";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { role } = body;

    if (!role || !["owner", "admin", "member"].includes(role)) {
      return NextResponse.json({
        error: "Valid role is required (owner, admin, or member)"
      }, { status: 400 });
    }

    const organization = await getOrganizationWithMembers(params.id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if requesting user is an admin or owner
    const requestingUserMember = organization.members.find(
      member => member.userId === result.session.userId
    );

    if (!requestingUserMember || (requestingUserMember.role !== "owner" && requestingUserMember.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden - Admin or owner required" }, { status: 403 });
    }

    // Find target member
    const targetMember = organization.members.find(
      member => member.id === params.memberId
    );

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent non-owners from changing owner role
    if (targetMember.role === "owner" && requestingUserMember.role !== "owner") {
      return NextResponse.json({
        error: "Only owners can change owner roles"
      }, { status: 403 });
    }

    // Prevent last owner from being demoted
    const ownerCount = organization.members.filter(m => m.role === "owner").length;
    if (targetMember.role === "owner" && ownerCount === 1 && role !== "owner") {
      return NextResponse.json({
        error: "Cannot change role of the last owner"
      }, { status: 400 });
    }

    const success = await updateMemberRole(params.id, targetMember.userId, role as "owner" | "admin" | "member");

    if (!success) {
      return NextResponse.json({ error: "Failed to update member role" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.MEMBER_ROLE_CHANGE,
      AUDIT_RESOURCES.ORGANIZATION_MEMBER,
      params.memberId,
      {
        organizationId: params.id,
        userId: targetMember.userId,
        oldRole: targetMember.role,
        newRole: role
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
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

    // Check if requesting user is an admin or owner
    const requestingUserMember = organization.members.find(
      member => member.userId === result.session.userId
    );

    if (!requestingUserMember || (requestingUserMember.role !== "owner" && requestingUserMember.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden - Admin or owner required" }, { status: 403 });
    }

    // Find target member
    const targetMember = organization.members.find(
      member => member.id === params.memberId
    );

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent removing the last owner
    const ownerCount = organization.members.filter(m => m.role === "owner").length;
    if (targetMember.role === "owner" && ownerCount === 1) {
      return NextResponse.json({
        error: "Cannot remove the last owner"
      }, { status: 400 });
    }

    // Only owners can remove other owners
    if (targetMember.role === "owner" && requestingUserMember.role !== "owner") {
      return NextResponse.json({
        error: "Only owners can remove other owners"
      }, { status: 403 });
    }

    const success = await removeMember(params.id, targetMember.userId);

    if (!success) {
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.MEMBER_REMOVE,
      AUDIT_RESOURCES.ORGANIZATION_MEMBER,
      params.memberId,
      {
        organizationId: params.id,
        userId: targetMember.userId,
        role: targetMember.role
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
