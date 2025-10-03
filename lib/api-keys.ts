import { db } from "@/db/drizzle";
import { apiKey } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "crypto";

export interface CreateApiKeyData {
  name: string;
  userId: string;
  organizationId?: string;
  permissions?: string[];
  expiresAt?: Date;
}

export interface ApiKeyWithDetails {
  id: string;
  name: string;
  userId: string;
  organizationId?: string;
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function generateApiKey(): string {
  const prefix = "sk_";
  const randomPart = randomBytes(32).toString("hex");
  return `${prefix}${randomPart}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(data: CreateApiKeyData): Promise<{ key: string; apiKey: ApiKeyWithDetails }> {
  const key = generateApiKey();
  const hashedKey = hashApiKey(key);
  
  const newApiKey = await db.insert(apiKey).values({
    id: nanoid(),
    name: data.name,
    hashedKey,
    userId: data.userId,
    organizationId: data.organizationId,
    permissions: data.permissions || [],
    expiresAt: data.expiresAt,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return {
    key,
    apiKey: {
      id: newApiKey[0].id,
      name: newApiKey[0].name,
      userId: newApiKey[0].userId,
      organizationId: newApiKey[0].organizationId,
      permissions: newApiKey[0].permissions || [],
      lastUsedAt: newApiKey[0].lastUsedAt,
      expiresAt: newApiKey[0].expiresAt,
      isActive: newApiKey[0].isActive,
      createdAt: newApiKey[0].createdAt,
      updatedAt: newApiKey[0].updatedAt,
    },
  };
}

export async function getApiKeysByUser(userId: string): Promise<ApiKeyWithDetails[]> {
  const keys = await db.select({
    id: apiKey.id,
    name: apiKey.name,
    userId: apiKey.userId,
    organizationId: apiKey.organizationId,
    permissions: apiKey.permissions,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  })
  .from(apiKey)
  .where(eq(apiKey.userId, userId));

  return keys.map(key => ({
    ...key,
    permissions: key.permissions || [],
  }));
}

export async function getApiKeysByOrganization(organizationId: string): Promise<ApiKeyWithDetails[]> {
  const keys = await db.select({
    id: apiKey.id,
    name: apiKey.name,
    userId: apiKey.userId,
    organizationId: apiKey.organizationId,
    permissions: apiKey.permissions,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  })
  .from(apiKey)
  .where(eq(apiKey.organizationId, organizationId));

  return keys.map(key => ({
    ...key,
    permissions: key.permissions || [],
  }));
}

export async function getApiKeyById(id: string): Promise<ApiKeyWithDetails | null> {
  const key = await db.select({
    id: apiKey.id,
    name: apiKey.name,
    userId: apiKey.userId,
    organizationId: apiKey.organizationId,
    permissions: apiKey.permissions,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  })
  .from(apiKey)
  .where(eq(apiKey.id, id))
  .limit(1);

  if (key.length === 0) {
    return null;
  }

  return {
    ...key[0],
    permissions: key[0].permissions || [],
  };
}

export async function validateApiKey(key: string): Promise<ApiKeyWithDetails | null> {
  const hashedKey = hashApiKey(key);
  
  const apiKeyRecord = await db.select({
    id: apiKey.id,
    name: apiKey.name,
    userId: apiKey.userId,
    organizationId: apiKey.organizationId,
    permissions: apiKey.permissions,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  })
  .from(apiKey)
  .where(and(
    eq(apiKey.hashedKey, hashedKey),
    eq(apiKey.isActive, true)
  ))
  .limit(1);

  if (apiKeyRecord.length === 0) {
    return null;
  }

  const keyData = apiKeyRecord[0];

  // Check if key is expired
  if (keyData.expiresAt && keyData.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp
  await db.update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, keyData.id));

  return {
    ...keyData,
    permissions: keyData.permissions || [],
  };
}

export async function updateApiKey(id: string, updates: {
  name?: string;
  permissions?: string[];
  isActive?: boolean;
  expiresAt?: Date;
}): Promise<ApiKeyWithDetails | null> {
  const updated = await db.update(apiKey)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(apiKey.id, id))
    .returning();

  if (updated.length === 0) {
    return null;
  }

  return {
    id: updated[0].id,
    name: updated[0].name,
    userId: updated[0].userId,
    organizationId: updated[0].organizationId,
    permissions: updated[0].permissions || [],
    lastUsedAt: updated[0].lastUsedAt,
    expiresAt: updated[0].expiresAt,
    isActive: updated[0].isActive,
    createdAt: updated[0].createdAt,
    updatedAt: updated[0].updatedAt,
  };
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const result = await db.delete(apiKey).where(eq(apiKey.id, id));
  return result.rowCount > 0;
}

export async function rotateApiKey(id: string): Promise<{ key: string; apiKey: ApiKeyWithDetails } | null> {
  const existingKey = await getApiKeyById(id);
  if (!existingKey) {
    return null;
  }

  const newKey = generateApiKey();
  const hashedKey = hashApiKey(newKey);

  const updated = await db.update(apiKey)
    .set({
      hashedKey,
      updatedAt: new Date(),
    })
    .where(eq(apiKey.id, id))
    .returning();

  return {
    key: newKey,
    apiKey: {
      id: updated[0].id,
      name: updated[0].name,
      userId: updated[0].userId,
      organizationId: updated[0].organizationId,
      permissions: updated[0].permissions || [],
      lastUsedAt: updated[0].lastUsedAt,
      expiresAt: updated[0].expiresAt,
      isActive: updated[0].isActive,
      createdAt: updated[0].createdAt,
      updatedAt: updated[0].updatedAt,
    },
  };
}
