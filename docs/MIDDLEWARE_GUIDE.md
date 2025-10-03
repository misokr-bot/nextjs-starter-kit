# RBAC Middleware Application Guide

## Overview

This guide shows how to apply Role-Based Access Control (RBAC) middleware to all API routes for complete security coverage.

## Middleware Functions

### Available Middleware

1. **`requireAuth`** - Requires user authentication
2. **`requireRole`** - Requires specific user role (user, admin, super_admin)
3. **`requirePermission`** - Requires specific RBAC permission
4. **`requireOrganization`** - Requires organization membership

### Import

```typescript
import {
  requireAuth,
  requireRole,
  requirePermission,
  requireOrganization,
  getClientIp,
  getUserAgent,
} from "@/lib/middleware/auth";
```

---

## Usage Patterns

### Pattern 1: Basic Authentication

**Use Case**: Public routes that need to know if user is authenticated

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";

export const GET = requireAuth(async (req, user) => {
  // user is guaranteed to be authenticated
  return NextResponse.json({
    message: `Hello, ${user.name}!`,
    userId: user.id,
  });
});
```

### Pattern 2: Role-Based Access

**Use Case**: Admin-only routes

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";

// Only super_admin and admin can access
export const GET = requireRole("admin", async (req, user) => {
  // Fetch all users (admin operation)
  const users = await getAllUsers();
  return NextResponse.json({ users });
});

// Only super_admin can access
export const DELETE = requireRole("super_admin", async (req, user) => {
  // Delete user (super admin operation)
  await deleteUser(userId);
  return NextResponse.json({ success: true });
});
```

### Pattern 3: Permission-Based Access (RBAC)

**Use Case**: Fine-grained permission control

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/middleware/auth";

// Require "read:own" permission on "apiKey" resource
export const GET = requirePermission("apiKey", "read:own", async (req, user, userContext) => {
  // userContext contains user role and organization info
  const apiKeys = await getApiKeysByUser(user.id);
  return NextResponse.json({ apiKeys });
});

// Require "create:own" permission on "apiKey" resource
export const POST = requirePermission("apiKey", "create:own", async (req, user, userContext) => {
  const body = await req.json();
  const apiKey = await createApiKey({
    ...body,
    userId: user.id,
    organizationId: userContext.organizationId,
  });
  return NextResponse.json({ apiKey });
});

// Require "delete:all" permission (admin only)
export const DELETE = requirePermission("apiKey", "delete:all", async (req, user, userContext) => {
  const { id } = await req.json();
  await deleteApiKey(id);
  return NextResponse.json({ success: true });
});
```

### Pattern 4: Organization Membership

**Use Case**: Organization-scoped routes

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/middleware/auth";

// GET /api/organizations/[id]/members
export const GET = requireOrganization(async (req, user, organizationId) => {
  // User is guaranteed to be a member of this organization
  const members = await getOrganizationMembers(organizationId);
  return NextResponse.json({ members });
});
```

---

## Route Protection Matrix

### Critical Routes (Priority 1 - Apply Immediately)

| Route | Method | Current | Required Middleware | Permission |
|-------|--------|---------|---------------------|------------|
| `/api/dev/api-keys` | GET | ❌ Manual | `requirePermission` | `apiKey:read:own` |
| `/api/dev/api-keys` | POST | ❌ Manual | `requirePermission` | `apiKey:create:own` |
| `/api/dev/api-keys/[id]` | PUT | ❌ Manual | `requirePermission` | `apiKey:update:own` |
| `/api/dev/api-keys/[id]` | DELETE | ❌ Manual | `requirePermission` | `apiKey:delete:own` |
| `/api/dev/api-keys/[id]/rotate` | POST | ❌ Manual | `requirePermission` | `apiKey:update:own` |
| `/api/2fa/setup` | POST | ❌ Manual | `requireAuth` | N/A |
| `/api/2fa/verify` | POST | ✅ Protected | N/A | N/A |
| `/api/2fa/disable` | POST | ❌ Manual | `requireAuth` | N/A |
| `/api/2fa/status` | GET | ❌ Manual | `requireAuth` | N/A |

### Organization Routes (Priority 2)

| Route | Method | Current | Required Middleware | Permission |
|-------|--------|---------|---------------------|------------|
| `/api/organizations` | GET | ❌ None | `requireAuth` | N/A |
| `/api/organizations` | POST | ❌ None | `requireAuth` | N/A |
| `/api/organizations/[id]` | GET | ❌ None | `requireOrganization` | N/A |
| `/api/organizations/[id]` | PUT | ❌ None | `requirePermission` | `organization:update:own` |
| `/api/organizations/[id]` | DELETE | ❌ None | `requirePermission` | `organization:delete:own` |
| `/api/organizations/[id]/invite` | POST | ❌ None | `requirePermission` | `organizationInvite:create:own` |

### Admin Routes (Priority 3)

| Route | Method | Current | Required Middleware | Permission |
|-------|--------|---------|---------------------|------------|
| `/api/admin/users` | GET | ❌ None | `requireRole("admin")` | N/A |
| `/api/admin/users/[id]` | PUT | ❌ None | `requireRole("admin")` | N/A |
| `/api/admin/users/[id]` | DELETE | ❌ None | `requireRole("super_admin")` | N/A |
| `/api/admin/organizations` | GET | ❌ None | `requireRole("admin")` | N/A |
| `/api/admin/audit-logs` | GET | ❌ None | `requireRole("admin")` | N/A |

---

## Migration Examples

### Before (Manual Auth Check)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getData(result.session.userId);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### After (With Middleware)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";

export const GET = requireAuth(async (req, user) => {
  try {
    const data = await getData(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
});
```

**Benefits**:
- ✅ Cleaner code (no try-catch for auth)
- ✅ Consistent error responses
- ✅ TypeScript type safety
- ✅ Centralized permission logic
- ✅ Easier to audit security

---

## Audit Logging Integration

Always log sensitive actions with IP and User-Agent:

```typescript
import { logUserAction, AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit";
import { getClientIp, getUserAgent } from "@/lib/middleware/auth";

export const POST = requirePermission("apiKey", "create:own", async (req, user, userContext) => {
  const body = await req.json();
  const apiKey = await createApiKey({ ...body, userId: user.id });

  // Log with IP and User-Agent
  await logUserAction(
    user.id,
    AUDIT_ACTIONS.API_KEY_CREATE,
    AUDIT_RESOURCES.API_KEY,
    apiKey.id,
    { name: apiKey.name },
    getClientIp(req),      // Extract IP
    getUserAgent(req)       // Extract User-Agent
  );

  return NextResponse.json({ apiKey });
});
```

---

## Permission Reference

### User-Level Permissions (lib/rbac.ts)

```typescript
// User role permissions
user: [
  { resource: "user", action: "read:own" },
  { resource: "user", action: "update:own" },
  { resource: "apiKey", action: "read:own" },
  { resource: "apiKey", action: "create:own" },
  { resource: "apiKey", action: "update:own" },
  { resource: "apiKey", action: "delete:own" },
]

// Admin role permissions
admin: [
  { resource: "user", action: "read:all" },
  { resource: "user", action: "update:all" },
  { resource: "apiKey", action: "read:all" },
  { resource: "apiKey", action: "delete:all" },
  { resource: "auditLog", action: "read:all" },
]

// Super admin permissions
super_admin: [
  { resource: "*", action: "*" } // All permissions
]
```

### Organization-Level Permissions

```typescript
// Member permissions
member: [
  { resource: "organization", action: "read:own" },
]

// Organization admin permissions
admin: [
  { resource: "organization", action: "update:own" },
  { resource: "organizationMember", action: "create:own" },
  { resource: "organizationMember", action: "update:own" },
  { resource: "organizationMember", action: "delete:own" },
]

// Organization owner permissions
owner: [
  { resource: "organization", action: "*" },
  { resource: "subscription", action: "*" },
]
```

---

## Testing Middleware

### Manual Testing

```bash
# Test authentication
curl -X GET http://localhost:3000/api/protected-route \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"

# Test permission denial (should return 403)
curl -X DELETE http://localhost:3000/api/admin/users/123 \
  -H "Cookie: better-auth.session_token=USER_TOKEN"

# Test admin access (should succeed)
curl -X DELETE http://localhost:3000/api/admin/users/123 \
  -H "Cookie: better-auth.session_token=ADMIN_TOKEN"
```

### Unit Testing (Future)

```typescript
describe("requirePermission middleware", () => {
  test("allows user with correct permission", async () => {
    const req = createMockRequest({ userId: "user1", role: "admin" });
    const response = await protectedRoute(req);
    expect(response.status).toBe(200);
  });

  test("denies user without permission", async () => {
    const req = createMockRequest({ userId: "user1", role: "user" });
    const response = await adminRoute(req);
    expect(response.status).toBe(403);
  });
});
```

---

## Implementation Checklist

### Phase 1: Critical Security Routes (Week 1)
- [x] `/api/dev/api-keys` (GET, POST)
- [ ] `/api/dev/api-keys/[id]` (GET, PUT, DELETE)
- [ ] `/api/dev/api-keys/[id]/rotate` (POST)
- [ ] `/api/2fa/setup` (POST)
- [ ] `/api/2fa/disable` (POST)
- [ ] `/api/2fa/status` (GET)

### Phase 2: Organization Routes (Week 2)
- [ ] `/api/organizations` (GET, POST)
- [ ] `/api/organizations/[id]` (GET, PUT, DELETE)
- [ ] `/api/organizations/[id]/invite` (POST)

### Phase 3: Admin Routes (Week 2)
- [ ] `/api/admin/users` (all methods)
- [ ] `/api/admin/organizations` (all methods)
- [ ] `/api/admin/audit-logs` (GET)

### Phase 4: Remaining Routes (Week 3)
- [ ] All other protected routes
- [ ] Verify 100% coverage with route audit

---

## Common Pitfalls

### ❌ Don't: Mix manual auth with middleware

```typescript
// BAD: Inconsistent pattern
export async function GET(req: NextRequest) {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result?.session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

### ✅ Do: Use middleware consistently

```typescript
// GOOD: Consistent pattern
export const GET = requireAuth(async (req, user) => {
  // user is already authenticated
});
```

### ❌ Don't: Forget audit logging

```typescript
// BAD: No audit trail
await deleteApiKey(id);
return NextResponse.json({ success: true });
```

### ✅ Do: Log all sensitive actions

```typescript
// GOOD: Complete audit trail
await deleteApiKey(id);
await logUserAction(
  user.id,
  AUDIT_ACTIONS.API_KEY_DELETE,
  AUDIT_RESOURCES.API_KEY,
  id,
  undefined,
  getClientIp(req),
  getUserAgent(req)
);
return NextResponse.json({ success: true });
```

---

## Performance Considerations

### Caching User Context

For high-traffic routes, consider caching user context:

```typescript
import { cache } from "react";

const getCachedUserContext = cache(async (userId: string) => {
  return await getUserContext(userId);
});
```

### Database Query Optimization

Middleware performs database queries. Ensure indexes exist:

```sql
CREATE INDEX idx_org_member_user_id ON "organizationMember"("userId");
CREATE INDEX idx_session_user_id ON "session"("userId");
```

---

## Next Steps

1. **Apply to all routes** - Use this guide to systematically protect all API endpoints
2. **Audit coverage** - Create a comprehensive route audit spreadsheet
3. **Write tests** - Add integration tests for permission enforcement
4. **Monitor logs** - Review audit logs for unauthorized access attempts
5. **Performance** - Add caching if middleware adds latency

---

## Resources

- **RBAC System**: `lib/rbac.ts`
- **Middleware**: `lib/middleware/auth.ts`
- **Audit Logging**: `lib/audit.ts`
- **Workflow**: `IMPLEMENTATION_WORKFLOW.md`

---

**Last Updated**: 2025-10-04
**Status**: 🚧 In Progress - Week 1 Security Hardening
**Coverage**: ~10% of routes protected (Target: 100%)
