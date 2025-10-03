import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createOrganization, getUserOrganizations } from "@/lib/organizations";
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await getUserOrganizations(result.session.userId);

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Failed to get organizations:", error);
    return NextResponse.json(
      { error: "Failed to get organizations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      ownerId: result.session.userId,
    });

    // Log the action
    await logUserAction(
      result.session.userId,
      AUDIT_ACTIONS.ORGANIZATION_CREATE,
      AUDIT_RESOURCES.ORGANIZATION,
      organization.id,
      { name: organization.name, slug: organization.slug }
    );

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Failed to create organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
