import { db } from "@/db/drizzle";
import { auditLog } from "@/db/schema";
import { nanoid } from "nanoid";

export interface AuditLogData {
  userId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(data: AuditLogData) {
  try {
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: data.userId,
      organizationId: data.organizationId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw error to avoid breaking the main flow
  }
}

export async function logUserAction(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  await logAuditEvent({
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
  });
}

export async function logOrganizationAction(
  userId: string,
  organizationId: string,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  await logAuditEvent({
    userId,
    organizationId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
  });
}

export async function logSystemAction(
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>
) {
  await logAuditEvent({
    action,
    resource,
    resourceId,
    details,
  });
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: "login",
  LOGOUT: "logout",
  LOGIN_FAILED: "login_failed",
  PASSWORD_CHANGE: "password_change",
  PASSWORD_RESET: "password_reset",
  
  // User Management
  USER_CREATE: "user_create",
  USER_UPDATE: "user_update",
  USER_DELETE: "user_delete",
  USER_ACTIVATE: "user_activate",
  USER_DEACTIVATE: "user_deactivate",
  
  // Organization Management
  ORGANIZATION_CREATE: "organization_create",
  ORGANIZATION_UPDATE: "organization_update",
  ORGANIZATION_DELETE: "organization_delete",
  MEMBER_ADD: "member_add",
  MEMBER_REMOVE: "member_remove",
  MEMBER_ROLE_CHANGE: "member_role_change",
  INVITE_SEND: "invite_send",
  INVITE_ACCEPT: "invite_accept",
  INVITE_REJECT: "invite_reject",
  
  // Subscription Management
  SUBSCRIPTION_CREATE: "subscription_create",
  SUBSCRIPTION_UPDATE: "subscription_update",
  SUBSCRIPTION_CANCEL: "subscription_cancel",
  SUBSCRIPTION_RENEW: "subscription_renew",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  
  // API Key Management
  API_KEY_CREATE: "api_key_create",
  API_KEY_UPDATE: "api_key_update",
  API_KEY_DELETE: "api_key_delete",
  API_KEY_ROTATE: "api_key_rotate",
  API_KEY_USE: "api_key_use",
  
  // Security
  TWO_FA_ENABLE: "two_fa_enable",
  TWO_FA_DISABLE: "two_fa_disable",
  TWO_FA_VERIFY: "two_fa_verify",
  TWO_FA_SETUP: "two_fa_setup",
  SECURITY_ALERT: "security_alert",
  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_UNLOCKED: "account_unlocked",
  
  // Data Access
  DATA_READ: "data_read",
  DATA_EXPORT: "data_export",
  DATA_DELETE: "data_delete",
} as const;

export const AUDIT_RESOURCES = {
  USER: "user",
  ORGANIZATION: "organization",
  ORGANIZATION_MEMBER: "organization_member",
  ORGANIZATION_INVITE: "organization_invite",
  SUBSCRIPTION: "subscription",
  API_KEY: "api_key",
  TWO_FA: "two_fa",
  AUDIT_LOG: "audit_log",
} as const;
