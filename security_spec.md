# Security Specification - QuoteMaster

## Data Invariants
1. A **User** must belong to exactly one **Tenant**.
2. All records (**Products**, **Clients**, **Quotations**) must have a `tenant_id` matching the user's `tenant_id`.
3. **Quotation Numbers** must be unique within a tenant (enforced by server-side logic and atomic counters, but rules should respect the tenant scope).
4. **Sales Reps** can only access and modify quotations they created or belong to their tenant.
5. **Client Admins** can manage all data within their tenant.
6. **Super Admins** can manage everything.

## The \"Dirty Dozen\" Payloads (Attack Vectors)

1. **Identity Theft**: User A tries to read/write User B's `tenant_id` data.
2. **Self-Promotion**: `sales_rep` tries to update their role to `client_admin`.
3. **Orphaned Writes**: Creating a `Quotation` with a `client_id` that doesn't exist.
4. **Shadow Fields**: Creating a `Product` with extra fields like `is_verified_by_platform: true`.
5. **Ghost Tenants**: Creating a tenant record without being a `super_admin`.
6. **Timeline Poisoning**: Setting `created_at` to a year in the future.
7. **Cross-Tenant Leak**: Listing quotients without filtering by `tenant_id`.
8. **Status Shortcut**: Moving a quotation from `draft` directly to `converted` bypassing business logic.
9. **Unverified Auth**: Accessing data with a non-verified email.
10. **Resource Exhaustion**: Writing a 1MB string into the `product_name` field.
11. **Negative Totals**: Setting `grand_total` to `-9999`.
12. **Id Poisoning**: Using a 500-character string as a document ID.

## Test Runner Plan
I will implement `firestore.rules` and verify them manually against these vectors.

## Rules Draft (Phase 3 Primitives)
We will use `isValidTenant`, `isValidUser`, `isOwner`, `isAdmin` helpers.
