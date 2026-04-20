# Security Specification - QuoteMaster

## Data Invariants
1. A **User Profile** cannot exist without being linked to a valid **Tenant ID**.
2. A **Client Admin** can only manage users, products, and clients within their own **Tenant**.
3. A **Sales Representative** can only create and view quotations within their own **Tenant**.
4. **Quotations** must have a `sales_rep_id` matching the authenticated user's UID.
5. **Invitations** are the only way for new users (other than the first tenant creator) to join a tenant with a predefined role.
6. The **First User** of a tenant is automatically a `client_admin` during onboarding.

## The "Dirty Dozen" Payloads (Attack Vectors)

| ID | Attack Vector | Target Collection | Payload / Action | Expected Result |
|---|---|---|---|---|
| 1 | Global Admin Escalation | `users/{uid}` | `{ role: 'super_admin' }` on create | **DENIED** |
| 2 | Tenant Admin Escalation | `users/{uid}` | `{ role: 'client_admin', tenant_id: 'target-tenant' }` | **DENIED** |
| 3 | Shadow Field Injection | `products/{id}` | `{ name: 'Pipe', ..., hidden_discount: 90 }` | **DENIED** (Strict Schema) |
| 4 | Cross-Tenant Read | `quotations` | `get()` quotation from another tenant | **DENIED** |
| 5 | Cross-Tenant Update | `tenants/{id}` | Update `quotation_counter` of another tenant | **DENIED** |
| 6 | Unverified Email Write | `any` | Perform write with `email_verified: false` | **DENIED** |
| 7 | Orphaned Quotation | `quotations` | Create quote with non-existent `client_id` | **DENIED** |
| 8 | Large Payload Attack | `products` | 2MB string in `name` field | **DENIED** (Size limits) |
| 9 | ID Poisoning | `clients/{id}` | ID containing path traverse characters `../` | **DENIED** (Regex) |
| 10 | Status Skipping | `quotations/{id}` | Jump from `draft` to `converted` without items | **DENIED** |
| 11 | Anonymous Data Wipe | `invitations` | `delete()` invitation without auth | **DENIED** |
| 12 | Counter Manipulation | `tenants/{id}` | Decrement `quotation_counter` | **DENIED** (Update gate) |

## Implementation Plan
1. **Harden `firestore.rules`** using the 8 Pillars (Master Gate, Validation Blueprints, ID Hardening, etc.).
2. **Remove Secrets from Bundle**: Modify `vite.config.ts` to stop inlining `GEMINI_API_KEY`.
3. **Add Verification**: Ensure `email_verified` is checked for all writes.
4. **Strict Schema**: Enforce `keys().hasOnly()` and size constraints on all fields.
