import { db } from "@/db/drizzle";
import { organization, organizationMember, organizationInvite, user } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendWelcomeEmail } from "@/lib/notifications/email";

export interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  ownerId: string;
}

export interface InviteMemberData {
  organizationId: string;
  email: string;
  role: "admin" | "member";
  invitedBy: string;
}

export interface OrganizationWithMembers {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    userId: string;
    role: string;
    isActive: boolean;
    joinedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  }[];
}

export async function createOrganization(data: CreateOrganizationData): Promise<OrganizationWithMembers> {
  const orgId = nanoid();
  
  // Create organization
  const [newOrg] = await db.insert(organization).values({
    id: orgId,
    name: data.name,
    slug: data.slug,
    description: data.description,
    website: data.website,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Add owner as organization member
  await db.insert(organizationMember).values({
    id: nanoid(),
    organizationId: orgId,
    userId: data.ownerId,
    role: "owner",
    isActive: true,
    joinedAt: new Date(),
    updatedAt: new Date(),
  });

  // Get organization with members
  return await getOrganizationWithMembers(orgId);
}

export async function getOrganizationWithMembers(organizationId: string): Promise<OrganizationWithMembers | null> {
  const org = await db.select({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    logo: organization.logo,
    website: organization.website,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  })
  .from(organization)
  .where(eq(organization.id, organizationId))
  .limit(1);

  if (org.length === 0) {
    return null;
  }

  const members = await db.select({
    id: organizationMember.id,
    userId: organizationMember.userId,
    role: organizationMember.role,
    isActive: organizationMember.isActive,
    joinedAt: organizationMember.joinedAt,
    userName: user.name,
    userEmail: user.email,
    userImage: user.image,
  })
  .from(organizationMember)
  .innerJoin(user, eq(organizationMember.userId, user.id))
  .where(eq(organizationMember.organizationId, organizationId));

  return {
    ...org[0],
    members: members.map(member => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      isActive: member.isActive,
      joinedAt: member.joinedAt,
      user: {
        id: member.userId,
        name: member.userName,
        email: member.userEmail,
        image: member.userImage,
      },
    })),
  };
}

export async function getUserOrganizations(userId: string): Promise<OrganizationWithMembers[]> {
  const userOrgs = await db.select({
    organizationId: organizationMember.organizationId,
  })
  .from(organizationMember)
  .where(and(
    eq(organizationMember.userId, userId),
    eq(organizationMember.isActive, true)
  ));

  const organizations = await Promise.all(
    userOrgs.map(org => getOrganizationWithMembers(org.organizationId))
  );

  return organizations.filter(org => org !== null) as OrganizationWithMembers[];
}

export async function inviteMember(data: InviteMemberData): Promise<{ invite: any; emailSent: boolean }> {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create invite
  const [invite] = await db.insert(organizationInvite).values({
    id: nanoid(),
    organizationId: data.organizationId,
    email: data.email,
    role: data.role,
    invitedBy: data.invitedBy,
    token,
    expiresAt,
    isAccepted: false,
    createdAt: new Date(),
  }).returning();

  // Send invitation email
  let emailSent = false;
  try {
    await sendWelcomeEmail({
      name: data.email.split('@')[0], // Use email prefix as name
      email: data.email,
    });
    emailSent = true;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
  }

  return { invite, emailSent };
}

export async function acceptInvite(token: string, userId: string): Promise<boolean> {
  // Find invite
  const invite = await db.select()
    .from(organizationInvite)
    .where(and(
      eq(organizationInvite.token, token),
      eq(organizationInvite.isAccepted, false)
    ))
    .limit(1);

  if (invite.length === 0) {
    return false;
  }

  const inviteData = invite[0];

  // Check if invite is expired
  if (inviteData.expiresAt < new Date()) {
    return false;
  }

  // Check if user is already a member
  const existingMember = await db.select()
    .from(organizationMember)
    .where(and(
      eq(organizationMember.organizationId, inviteData.organizationId),
      eq(organizationMember.userId, userId)
    ))
    .limit(1);

  if (existingMember.length > 0) {
    return false;
  }

  // Add user to organization
  await db.insert(organizationMember).values({
    id: nanoid(),
    organizationId: inviteData.organizationId,
    userId,
    role: inviteData.role,
    isActive: true,
    joinedAt: new Date(),
    updatedAt: new Date(),
  });

  // Mark invite as accepted
  await db.update(organizationInvite)
    .set({
      isAccepted: true,
      acceptedAt: new Date(),
    })
    .where(eq(organizationInvite.id, inviteData.id));

  return true;
}

export async function updateMemberRole(
  organizationId: string,
  userId: string,
  newRole: "owner" | "admin" | "member"
): Promise<boolean> {
  const result = await db.update(organizationMember)
    .set({
      role: newRole,
      updatedAt: new Date(),
    })
    .where(and(
      eq(organizationMember.organizationId, organizationId),
      eq(organizationMember.userId, userId)
    ));

  return result.rowCount > 0;
}

export async function removeMember(organizationId: string, userId: string): Promise<boolean> {
  const result = await db.delete(organizationMember)
    .where(and(
      eq(organizationMember.organizationId, organizationId),
      eq(organizationMember.userId, userId)
    ));

  return result.rowCount > 0;
}

export async function updateOrganization(
  organizationId: string,
  updates: {
    name?: string;
    slug?: string;
    description?: string;
    website?: string;
    logo?: string;
  }
): Promise<boolean> {
  const result = await db.update(organization)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(organization.id, organizationId));

  return result.rowCount > 0;
}

export async function deleteOrganization(organizationId: string): Promise<boolean> {
  // Delete all members first
  await db.delete(organizationMember)
    .where(eq(organizationMember.organizationId, organizationId));

  // Delete all invites
  await db.delete(organizationInvite)
    .where(eq(organizationInvite.organizationId, organizationId));

  // Delete organization
  const result = await db.delete(organization)
    .where(eq(organization.id, organizationId));

  return result.rowCount > 0;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationWithMembers | null> {
  const org = await db.select({
    id: organization.id,
  })
  .from(organization)
  .where(and(
    eq(organization.slug, slug),
    eq(organization.isActive, true)
  ))
  .limit(1);

  if (org.length === 0) {
    return null;
  }

  return await getOrganizationWithMembers(org[0].id);
}
