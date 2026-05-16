# KnotEngine Cloud — Multi-Tenant Architecture Plan

## Current State vs. Target

| Aspect             | Current (Single-Tenant)        | Target (Multi-Tenant Cloud)                   |
| ------------------ | ------------------------------ | --------------------------------------------- |
| **Ownership**      | User → Merchants               | User → Organizations → Merchants              |
| **Auth**           | API key or OAuth → Merchant    | API key → Merchant → Organization             |
| **Billing**        | Per-merchant plan              | Per-organization plan                         |
| **API Keys**       | 1 per merchant                 | Multiple per merchant (labels, perms, expiry) |
| **Access Control** | User owns merchant             | RBAC: owner, admin, member, viewer            |
| **Credit Balance** | Shared across user's merchants | Per-organization                              |
| **Audit Logs**     | User-scoped                    | Organization-scoped                           |

---

## Phase 1: Schema Preparation

### New Collections

#### 1. Organization Model

```typescript
interface IOrganization {
  organizationId: string; // org_xxx
  name: string;
  ownerUserId: ObjectId; // ref User
  plan: "starter" | "professional" | "enterprise";
  creditBalance: number; // Moved from User
  planExpiresAt?: Date; // For paid plans
  customDomain?: string; // checkout.yourbrand.com
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Membership Model

```typescript
interface IMembership {
  organizationId: ObjectId; // ref Organization
  userId: ObjectId; // ref User
  role: "owner" | "admin" | "member" | "viewer";
  invitedAt: Date;
  acceptedAt?: Date;
  inviteToken?: string; // For email invitations
}
```

### Existing Model Changes

| Model                   | Change                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Merchant**            | Add `organizationId: ObjectId` (required). Deprecate `userId`                         |
| **User**                | Remove `creditBalance`, `referralCode`, `referredBy`, `referralEarningsUsd`           |
| **WebhookEvent**        | Add `merchantId: ObjectId` for direct querying                                        |
| **AuditLog**            | Add `organizationId: ObjectId`                                                        |
| **Merchant.apiKeyHash** | Change to `apiKeys: [{ hash, label, permissions, createdAt, lastUsedAt, expiresAt }]` |

---

## Phase 2: Migration Strategy

### Step 1: Auto-Migrate Existing Data

For every existing User:

1. Create an Organization with `ownerUserId = user._id`
2. Move all Merchants from `userId` → `organizationId`
3. Create Membership record: `{ organizationId, userId: user._id, role: "owner", acceptedAt: now }`
4. Move `user.creditBalance` → `organization.creditBalance`

### Step 2: Dual-Write Period

During transition:

- Writes go to both `userId` and `organizationId`
- Reads prefer `organizationId`, fall back to `userId`
- Add migration script to `scripts/migrate-to-multi-tenant.ts`

### Step 3: Cleanup

After all services updated:

- Remove `userId` from Merchant model
- Remove `creditBalance` from User model
- Update all queries to use `organizationId`

---

## Phase 3: Authentication Updates

### API Key System

```typescript
// Current
merchant.apiKeyHash: string  // Single key

// Target
merchant.apiKeys: [
  {
    hash: "sha256_xxx",
    label: "Production",
    permissions: ["invoices:*", "merchants:read"],
    createdAt: Date,
    lastUsedAt: Date,
    expiresAt: Date | null,
  }
]
```

### Auth Middleware Changes

```typescript
// Current
const merchant = await Merchant.findOne({ apiKeyHash: hash });

// Target
const merchant = await Merchant.findOne({ "apiKeys.hash": hash });
const membership = await Membership.findOne({
  organizationId: merchant.organizationId,
  userId: request.user._id,
});
// Check membership.role has required permissions
```

### Dashboard Auth

- JWT token includes: `organizationId`, `role`, `merchants[]`
- Add organization switcher UI
- Validate merchant belongs to user's organization

---

## Phase 4: RBAC Permissions

| Permission              | Owner | Admin | Member | Viewer |
| ----------------------- | ----- | ----- | ------ | ------ |
| View invoices           | ✅    | ✅    | ✅     | ✅     |
| Create invoices         | ✅    | ✅    | ✅     | ❌     |
| Cancel/resolve invoices | ✅    | ✅    | ❌     | ❌     |
| Manage webhooks         | ✅    | ✅    | ❌     | ❌     |
| View analytics          | ✅    | ✅    | ✅     | ✅     |
| Manage API keys         | ✅    | ✅    | ❌     | ❌     |
| Manage billing/plan     | ✅    | ❌    | ❌     | ❌     |
| Manage team members     | ✅    | ❌    | ❌     | ❌     |
| Delete organization     | ✅    | ❌    | ❌     | ❌     |

---

## Phase 5: Infrastructure

### Recommended Stack

```
┌─────────────────────────────────────────────────┐
│                   Cloudflare                     │
│              (CDN + SSL + DDoS)                  │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  API #1  │ │  API #2  │ │  API #3  │
    │ (ECS/Fargate)         │ (Auto-scale)│
    └──────────┴─────┬─────┴──────────────┘
                     │
          ┌──────────┼──────────┐
          ▼                     ▼
    ┌──────────────┐    ┌──────────────┐
    │ MongoDB Atlas│    │  Redis Cloud │
    │ (Clustered)  │    │  (Managed)   │
    └──────────────┘    └──────────────┘
```

| Component  | Service                                     | Cost (est.)         |
| ---------- | ------------------------------------------- | ------------------- |
| Compute    | AWS ECS Fargate / DigitalOcean App Platform | $50-200/mo          |
| Database   | MongoDB Atlas M10                           | $100/mo             |
| Cache      | Redis Cloud 30MB                            | $10/mo              |
| Storage    | S3 (logo uploads)                           | $5/mo               |
| Email      | Resend                                      | $20/mo (10k emails) |
| Monitoring | Sentry + Grafana Cloud                      | $0-30/mo            |
| **Total**  |                                             | **~$185-365/mo**    |

---

## Phase 6: Cloud-Only Features

| Feature                 | Self-Hosted (OSS) | Cloud |
| ----------------------- | ----------------- | ----- |
| Core payment processing | ✅                | ✅    |
| Dashboard & analytics   | ✅                | ✅    |
| Webhook delivery        | ✅                | ✅    |
| SDK & API               | ✅                | ✅    |
| Custom domains          | ❌                | ✅    |
| Team collaboration      | ❌                | ✅    |
| Auto-SSL                | ❌                | ✅    |
| Managed backups         | ❌                | ✅    |
| Priority support        | ❌                | ✅    |
| SLA (99.9%)             | ❌                | ✅    |
| Advanced reporting      | ❌                | ✅    |

---

## Timeline

| Phase               | Duration     | Dependencies |
| ------------------- | ------------ | ------------ |
| 1. Schema prep      | 1 week       | None         |
| 2. Migration script | 1 week       | Phase 1      |
| 3. Auth updates     | 2 weeks      | Phase 1-2    |
| 4. RBAC             | 2 weeks      | Phase 3      |
| 5. Infrastructure   | 2 weeks      | Phase 1-4    |
| 6. Cloud features   | 2 weeks      | Phase 1-5    |
| **Total**           | **10 weeks** |              |

---

## Next Steps

1. **Create Organization & Membership models** in `packages/database/src/models/`
2. **Write migration script** to convert existing users → organizations
3. **Update auth middleware** to resolve organization context
4. **Add API key management** (multiple keys per merchant)
5. **Build team management UI** in dashboard (invite members, assign roles)
6. **Set up cloud infrastructure** (Terraform, MongoDB Atlas, etc.)
7. **Launch beta** with early adopters
