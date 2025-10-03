import { db } from "@/db/drizzle";
import { twoFactorAuth } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { nanoid } from "nanoid";

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  backupCodeUsed?: boolean;
}

export async function generateTwoFactorSecret(userId: string, userEmail: string): Promise<TwoFactorSetup> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `SaaS App (${userEmail})`,
    issuer: "SaaS App",
    length: 32,
  });

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () => nanoid(8).toUpperCase());

  // Store in database (not enabled yet)
  await db.insert(twoFactorAuth).values({
    id: nanoid(),
    userId,
    secret: secret.base32,
    backupCodes,
    isEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
  };
}

export async function verifyTwoFactorCode(
  userId: string,
  token: string
): Promise<TwoFactorVerification> {
  const twoFactorRecord = await db.select()
    .from(twoFactorAuth)
    .where(and(
      eq(twoFactorAuth.userId, userId),
      eq(twoFactorAuth.isEnabled, true)
    ))
    .limit(1);

  if (twoFactorRecord.length === 0) {
    return { isValid: false };
  }

  const record = twoFactorRecord[0];

  // Check if it's a backup code
  if (record.backupCodes.includes(token)) {
    // Remove used backup code
    const updatedBackupCodes = record.backupCodes.filter(code => code !== token);
    await db.update(twoFactorAuth)
      .set({
        backupCodes: updatedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.id, record.id));

    return { isValid: true, backupCodeUsed: true };
  }

  // Verify TOTP code
  const isValid = speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time windows (1 minute each)
  });

  return { isValid };
}

export async function enableTwoFactor(userId: string, token: string): Promise<boolean> {
  const twoFactorRecord = await db.select()
    .from(twoFactorAuth)
    .where(and(
      eq(twoFactorAuth.userId, userId),
      eq(twoFactorAuth.isEnabled, false)
    ))
    .limit(1);

  if (twoFactorRecord.length === 0) {
    return false;
  }

  const record = twoFactorRecord[0];

  // Verify the token
  const isValid = speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token,
    window: 2,
  });

  if (!isValid) {
    return false;
  }

  // Enable 2FA
  await db.update(twoFactorAuth)
    .set({
      isEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(twoFactorAuth.id, record.id));

  return true;
}

export async function disableTwoFactor(userId: string): Promise<boolean> {
  const result = await db.update(twoFactorAuth)
    .set({
      isEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(twoFactorAuth.userId, userId));

  return result.rowCount > 0;
}

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const twoFactorRecord = await db.select()
    .from(twoFactorAuth)
    .where(and(
      eq(twoFactorAuth.userId, userId),
      eq(twoFactorAuth.isEnabled, true)
    ))
    .limit(1);

  return twoFactorRecord.length > 0;
}

export async function getTwoFactorStatus(userId: string): Promise<{
  isEnabled: boolean;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}> {
  const twoFactorRecord = await db.select()
    .from(twoFactorAuth)
    .where(eq(twoFactorAuth.userId, userId))
    .limit(1);

  if (twoFactorRecord.length === 0) {
    return {
      isEnabled: false,
      hasBackupCodes: false,
      backupCodesCount: 0,
    };
  }

  const record = twoFactorRecord[0];
  return {
    isEnabled: record.isEnabled,
    hasBackupCodes: record.backupCodes.length > 0,
    backupCodesCount: record.backupCodes.length,
  };
}

export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const newBackupCodes = Array.from({ length: 10 }, () => nanoid(8).toUpperCase());

  await db.update(twoFactorAuth)
    .set({
      backupCodes: newBackupCodes,
      updatedAt: new Date(),
    })
    .where(eq(twoFactorAuth.userId, userId));

  return newBackupCodes;
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => nanoid(8).toUpperCase());
}

export function validateBackupCode(backupCodes: string[], code: string): boolean {
  return backupCodes.includes(code);
}

export function removeUsedBackupCode(backupCodes: string[], usedCode: string): string[] {
  return backupCodes.filter(code => code !== usedCode);
}
