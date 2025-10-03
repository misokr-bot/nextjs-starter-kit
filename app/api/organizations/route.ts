import { NextRequest, NextResponse } from "next/server";
import { createOrganization, getUserOrganizations } from "@/lib/organizations";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { requireAuth, getClientIp, getUserAgent } from "@/lib/middleware/auth";

export const GET = requireAuth(async (req, user) => {
  try {
    const organizations = await getUserOrganizations(user.id);
    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Failed to get organizations:", error);
    return NextResponse.json(
      { error: "Failed to get organizations" },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { name, slug, description, website } = body;

    if (!name || !slug) {
      return NextResponse.json({
        error: "Name and slug are required"
      }, { status: 400 });
    }

    const organization = await createOrganization({
      name,
      slug,
      description,
      website,
      ownerId: user.id,
    });

    // Log the action
    await logUserAction(
      user.id,
      AUDIT_ACTIONS.ORGANIZATION_CREATE,
      AUDIT_RESOURCES.ORGANIZATION,
      organization.id,
      { name: organization.name, slug: organization.slug },
      getClientIp(req),
      getUserAgent(req)
    );

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Failed to create organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
});
